#!/usr/bin/env node
// npm run users:demo — створює синтетичних користувачів із supabase/demo-users.json через Admin API
// і ставить їм роль у public.profiles. Ідемпотентно: наявних користувачів не дублює, а оновлює
// їм пароль, ім'я та роль.
//
// Потрібні змінні (npm run users:demo читає .env.local через `node --env-file`):
//   NEXT_PUBLIC_SUPABASE_URL  — адреса проєкту;
//   SUPABASE_SECRET_KEY       — секретний ключ (sb_secret_…), лише на сервері, ніколи NEXT_PUBLIC_;
//   DEMO_USER_PASSWORD        — один пароль для всіх демо-користувачів (≥ 8 символів), не комітиться.
//
// Аргументи (npm run users:pm:staging, ADR 0007):
//   [файл]                — список користувачів (типово supabase/demo-users.json);
//   --env <файл>          — узяти змінні з цього файлу, ПЕРЕКРИВАЮЧИ змінні оболонки (`node --env-file` їх не
//                           перекриває: прод-URL з оболонки потрапив би в createClient);
//   --forbid-env <файл>   — відмовити, якщо ref проєкту збігається з ref NEXT_PUBLIC_SUPABASE_URL цього файлу
//                           (для staging — .env.local проду), щоб не записати акаунти в чужу базу.
// Чому скрипт, а не реєстрація: вбудований SMTP Supabase надсилає 2 листи/год і лише членам команди проєкту в Supabase,
// тому email-підтвердження в навчальних проєктах вимкнено, а користувачів створюємо тут (email_confirm: true).
// Скрипт ніколи не друкує значення ключів і паролів.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function takeOption(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (!value || value.startsWith("--")) {
    console.error(`Після ${name} вкажіть шлях до файлу.`);
    process.exit(1);
  }
  args.splice(i, 2);
  return value;
}
function readEnvFile(file) {
  try {
    return parseEnv(readFileSync(file, "utf8"));
  } catch {
    console.error(`Не вдалося прочитати файл змінних ${file}: файл не знайдено або він некоректний.`);
    process.exit(1);
  }
}
const supabaseRef = (value) => /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(value ?? "")?.[1] ?? null;

const envFile = takeOption("--env");
const forbidEnvFile = takeOption("--forbid-env");
const env = envFile ? { ...process.env, ...readEnvFile(envFile) } : process.env;
const envLabel = envFile ?? ".env.local";

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const password = env.DEMO_USER_PASSWORD;

const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", url],
  ["SUPABASE_SECRET_KEY", secretKey],
  ["DEMO_USER_PASSWORD", password],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length) {
  console.error(`Не задано: ${missing.join(", ")}. Додайте їх у ${envLabel} (див. .env.example).`);
  process.exit(1);
}
if (password.length < 8) {
  console.error("DEMO_USER_PASSWORD має бути не коротшим за 8 символів.");
  process.exit(1);
}

if (forbidEnvFile) {
  const ref = supabaseRef(url);
  const forbiddenRef = supabaseRef(readEnvFile(forbidEnvFile).NEXT_PUBLIC_SUPABASE_URL);
  if (!ref) {
    console.error(`NEXT_PUBLIC_SUPABASE_URL не схожий на https://<ref>.supabase.co — перевірте ${envLabel}.`);
    process.exit(1);
  }
  if (ref === forbiddenRef) {
    console.error(`Проєкт Supabase збігається з проєктом із ${forbidEnvFile} — користувачів не створено. Перевірте ${envLabel} і змінні оболонки.`);
    process.exit(1);
  }
}

const file = path.resolve(args[0] ?? path.join("supabase", "demo-users.json"));
const fileLabel = path.relative(process.cwd(), file);
let users;
try {
  users = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  const reason = e?.code === "ENOENT" ? "файл не знайдено" : e instanceof SyntaxError ? "некоректний JSON" : "помилка читання";
  console.error(`Не вдалося прочитати ${fileLabel}: ${reason}.`);
  process.exit(1);
}
if (!Array.isArray(users)) {
  console.error(`${fileLabel} має містити масив користувачів.`);
  process.exit(1);
}
for (const u of users) {
  if (!/^[^@\s]+@example\.test$/i.test(u.email ?? "")) {
    console.error(`Лише синтетичні адреси *@example.test: "${u.email}" у ${fileLabel}.`);
    process.exit(1);
  }
  // role: null — користувач, який увійшов, але ще без ролі (AC-CARD-11); ключ role обов'язковий, щоб null був свідомим.
  if (!("role" in u) || (u.role !== null && !["admin", "scheduler", "therapist"].includes(u.role))) {
    console.error(`Для ${u.email} вкажіть role: "admin", "scheduler", "therapist" або null (без ролі).`);
    process.exit(1);
  }
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }
}

let failed = 0;
for (const u of users) {
  try {
    let id;
    let action;
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name ?? null },
    });
    if (!error) {
      id = data.user.id;
      action = "створено";
    } else if (["email_exists", "user_already_exists"].includes(error.code ?? "") || /already/i.test(error.message)) {
      id = await findUserId(u.email);
      if (!id) throw new Error(`користувач існує, але не знайдений через listUsers`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name ?? null },
      });
      if (updateError) throw updateError;
      action = "оновлено";
    } else {
      throw error;
    }

    // Профіль створює тригер on_auth_user_created; upsert робить крок ідемпотентним
    // і ставить роль (колонку role змінює лише service_role — див. міграцію).
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id, email: u.email, full_name: u.full_name ?? null, role: u.role }, { onConflict: "id" });
    if (profileError) throw profileError;

    console.log(`✔ ${u.email} — ${action}, ${u.role ? `роль ${u.role}` : "без ролі"}`);
  } catch (e) {
    failed++;
    console.error(`✖ ${u.email}: ${e.message ?? e}`);
  }
}

if (failed) {
  console.error(
    `\nПомилок: ${failed}. Перевірте, що міграції застосовано (job db-deploy у CI) і ключ — секретний (sb_secret_…).`,
  );
  process.exit(1);
}
console.log(`\nГотово (${new URL(url).host}), користувачів: ${users.length}. Пароль — значення DEMO_USER_PASSWORD (у консоль не виводимо).`);
