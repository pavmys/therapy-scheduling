// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — матеріали курсу WS8, materials/testing/scripts/mutants.mjs (там же приклади з демо).
// Поля:
//   id, kind ("sql" | "ts"), ac (який AC це правило доводить), what (що зламано — людською мовою);
//   file — що мутуємо; tests — файли тестів, які мають довести правило (саме їх і запускаємо);
//   find — рядок або RegExp, що трапляється у файлі РІВНО один раз (надійніше за номери рядків, які зсуваються);
//   replace — заміна (вставляється буквально: «$$» у plpgsql лишається «$$»);
//   expect: "survive" + reason — лише для еквівалентного мутанта (поведінка не змінюється) з посиланням на те,
//   що робить його еквівалентним (рядок міграції, інший тест). Без reason скрипт мутант не приймає.
// Новий AC з відмовою, правило якого живе в SQL (політика, grant, функція, тригер), — новий мутант тут.
//
// P1/P2 з матеріалів (перевірка гарнесу на profiles) не беремо: гарнес PGlite у нас свій і вже перевірений
// тестами tests/db/. Мутанти — на SQL-правила AC-CARD-06 і AC-CARD-07 (WS8, трек B). Правило AC-CARD-16 живе
// в TS (src/lib/clients/view.ts) і на сторінці — його доводить Stryker (npm run mutation:ts), а не цей список.
const ROLES_AND_CLIENTS = "supabase/migrations/20261022040716_roles_and_clients.sql";
const SLOTS_AND_HOLDS = "supabase/migrations/20261022042804_slots_and_holds.sql";
const CLIENT_CARDS_DB = "tests/db/client-cards.test.ts";
const APP_ACCESS_DB = "tests/db/app-access.test.ts";

export const mutants = [
  // ── AC-CARD-06: терапевт не створює картку клієнта ────────────────────────────────────────────────────────────
  {
    id: "C1", kind: "sql", ac: "AC-CARD-06", file: ROLES_AND_CLIENTS, tests: [CLIENT_CARDS_DB],
    what: "політика clients_insert_staff послаблена до true: картку створює будь-хто з входом",
    find: "with check ((select private.is_staff()));",
    replace: "with check (true);",
  },
  {
    id: "C2", kind: "sql", ac: "AC-CARD-06", file: ROLES_AND_CLIENTS, tests: [CLIENT_CARDS_DB],
    what: "хелпер private.is_staff() рахує терапевта за staff",
    find: "private.current_app_role() in ('admin', 'scheduler')",
    replace: "private.current_app_role() in ('admin', 'scheduler', 'therapist')",
  },
  // ── AC-CARD-07: без входу — жодних даних клієнтів чи утримань, жодна картка не змінилась ────────────────────────
  // Політики clients і holds — лише `to authenticated`, тож з цими grant анонім отримав би 0 рядків чи відмову RLS,
  // а не дані. Тест тримає саме перший бар'єр (GRANT: «permission denied»), і мутант це має показати.
  {
    id: "C3", kind: "sql", ac: "AC-CARD-07", file: ROLES_AND_CLIENTS, tests: [APP_ACCESS_DB],
    what: "grant select на clients і для anon: анонім читає таблицю карток",
    find: "grant select on table public.clients to authenticated;",
    replace: "grant select on table public.clients to authenticated, anon;",
  },
  {
    id: "C4", kind: "sql", ac: "AC-CARD-07", file: ROLES_AND_CLIENTS, tests: [APP_ACCESS_DB],
    what: "grant insert (full_name, email) на clients і для anon: анонім пише в таблицю карток",
    find: "grant insert (full_name, email) on table public.clients to authenticated;",
    replace: "grant insert (full_name, email) on table public.clients to authenticated, anon;",
  },
  {
    id: "C5", kind: "sql", ac: "AC-CARD-07", file: SLOTS_AND_HOLDS, tests: [APP_ACCESS_DB],
    what: "grant select на holds і для anon: анонім читає утримання",
    find: "grant select on table public.holds to authenticated;",
    replace: "grant select on table public.holds to authenticated, anon;",
  },
  // ── Еквівалентний для правил наших AC ──────────────────────────────────────────────────────────────────────────
  {
    id: "C6", kind: "sql", ac: "AC-CARD-06, AC-CARD-07", file: ROLES_AND_CLIENTS, tests: [CLIENT_CARDS_DB, APP_ACCESS_DB],
    what: "private.is_staff() без coalesce: для користувача без ролі NULL замість false",
    find: "select coalesce(private.current_app_role() in ('admin', 'scheduler'), false);",
    replace: "select private.current_app_role() in ('admin', 'scheduler');",
    expect: "survive",
    reason:
      "еквівалентний для політик clients: NULL в using / with check RLS вважає відмовою, як false. coalesce потрібен " +
      "лише для `not private.is_staff()` у функціях утримань (20261022042804_slots_and_holds.sql:115, AC-HOLD-08) — " +
      "це правило поза AC цього списку",
  },
  // ── TS, точкові мутанти на межі з AC (повний перебір TS — npm run mutation:ts, Stryker). Stryker на view.ts і
  // access.ts вижилих на рядках цих AC не лишив, тож тут — ручний мутант на кожну межу, який тест має вбити.
  {
    id: "T1", kind: "ts", ac: "AC-CARD-16", file: "src/lib/clients/view.ts", tests: ["src/lib/clients/view.test.ts"],
    what: "missingClientMessage: терапевт бачить «This client card doesn't exist.» — підказку, що картки немає",
    find: 'return role === "therapist" ? NO_ACCESS_TO_CLIENT_MESSAGE : CLIENT_CARD_NOT_FOUND_MESSAGE;',
    replace: "return CLIENT_CARD_NOT_FOUND_MESSAGE;",
  },
  {
    id: "T2", kind: "ts", ac: "AC-CARD-07", file: "src/lib/access.ts", tests: ["src/lib/access.test.ts"],
    what: "accessFor: без входу — екран «без ролі» замість сторінки входу",
    find: 'if (!user) return "login";',
    replace: 'if (!user) return "no-role";',
  },
];
