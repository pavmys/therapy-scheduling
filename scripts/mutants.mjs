import { readFileSync } from "node:fs";

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
const INSURANCE_STATUS = "supabase/migrations/20261109112112_insurance_status.sql";
const INSURANCE_STATUS_DB = "tests/db/insurance-status.test.ts";
const CONSENT = "supabase/migrations/20261116192352_consent_documents.sql";
const CONSENT_DB = "tests/db/consent-documents.test.ts";
const CONSENT_PAGE = "src/app/clients/[id]/consent/[kind]/page.tsx";
const CONSENT_PAGE_TEST = "src/app/clients/[id]/consent/[kind]/page.test.ts";

// «Один набір на картку» (AC-DOC-02) тримають ДВА бар'єри: перевірка «документи вже є» у
// prepare_consent_documents_impl і unique (client_id, kind) з on conflict do nothing. Мутант лише одного з них
// еквівалентний, тож D3 знімає обидва однією заміною: find — увесь фрагмент міграції від constraint до on conflict
// (читаємо з файлу, щоб не копіювати 60 рядків руками), replace — той самий фрагмент без обох бар'єрів.
const ONE_SET_FROM = "  constraint consent_documents_client_kind_key unique (client_id, kind),\n";
const ONE_SET_TO = "\n    on conflict (client_id, kind) do nothing;";
const ONE_SET_GUARD =
  "if not exists (select 1 from public.consent_documents as d where d.client_id = p_client_id) then";
const consentSql = readFileSync(CONSENT, "utf8").replace(/\r\n/g, "\n");
const oneSetBlock = consentSql.slice(
  consentSql.indexOf(ONE_SET_FROM),
  consentSql.indexOf(ONE_SET_TO) + ONE_SET_TO.length,
);

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
  // ── Ворота для правила AGENTS.md: security definer лише з set search_path = '' (вада 1 з eval рецензента, PR #39)
  {
    id: "S1", kind: "sql", ac: "правило AGENTS.md (security definer)", file: ROLES_AND_CLIENTS,
    tests: ["tests/db/security-definer.test.ts"],
    what: "private.is_staff() — security definer без set search_path = ''",
    find: "set search_path = ''\nas $$\n  select coalesce(private.current_app_role() in ('admin', 'scheduler'), false);",
    replace: "as $$\n  select coalesce(private.current_app_role() in ('admin', 'scheduler'), false);",
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
  {
    id: "T3", kind: "ts", ac: "AC-HOLD-37", file: "src/lib/holds/status.ts", tests: ["src/lib/holds/status.test.ts"],
    what: "holdsList: прострочене приховує будь-яке інше утримання того самого клієнта на слот, не лише новіше — " +
      "коли й повторне утримання прострочилось, зникають обидва «Expired» (вада 3 з eval рецензента, PR #39)",
    find: "ms(h.created_at) > ms(expired.created_at),",
    replace: "true,",
  },
  // ── Зріз 3, статус перевірки страхування (design.md impl-insurance-status, D4) ────────────────────────────────
  // AC-INS-05 у SQL: мутант знімає ОБИДВІ перевірки ролі — лише `using (true)` вижив би, бо with check однаково
  // відхилить новий рядок терапевта. AC-INS-06 в SQL має два незалежні бар'єри (немає grant для anon, політика
  // `to authenticated`) — мутант одного з них еквівалентний, тож відмову гостю доводимо мутантом сторінки (I3).
  {
    id: "I1", kind: "sql", ac: "AC-INS-05", file: INSURANCE_STATUS, tests: [INSURANCE_STATUS_DB],
    what: "clients_update_insurance_staff без перевірки ролі: статус змінює будь-хто з входом, зокрема терапевт",
    find: "  using ((select private.is_staff()))\n  with check ((select private.is_staff()) and insurance_status <> 'not_set');",
    replace: "  using (true)\n  with check (insurance_status <> 'not_set');",
  },
  {
    id: "I5", kind: "sql", ac: "AC-INS-02", file: INSURANCE_STATUS, tests: [INSURANCE_STATUS_DB],
    what: "clients_update_insurance_staff без заборони «Not set»: працівник повертає статус до початкового",
    find: "with check ((select private.is_staff()) and insurance_status <> 'not_set');",
    replace: "with check ((select private.is_staff()));",
  },
  {
    id: "I2", kind: "ts", ac: "AC-INS-05", file: "src/app/clients/[id]/actions.ts", tests: ["src/app/clients/[id]/actions.test.ts"],
    what: "setInsuranceStatus без перевірки ролі: терапевт отримує запит update замість зрозумілої відмови",
    find: "if (!user || !isStaffRole(user.role)) {",
    replace: "if (!user) {",
  },
  {
    id: "I3", kind: "ts", ac: "AC-INS-06", file: "src/app/clients/[id]/page.tsx", tests: ["src/app/clients/[id]/page.test.ts"],
    what: "картка клієнта без redirect(\"/login\"): гість не потрапляє на сторінку входу",
    find: 'if (access === "login") redirect("/login");',
    replace: 'if (access === "login") void 0;',
  },
  {
    id: "I4", kind: "ts", ac: "AC-INS-04", file: "src/app/clients/[id]/page.tsx", tests: ["src/app/clients/[id]/page.test.ts"],
    what: "форма статусу страхування рендериться й терапевту",
    find: 'role === "staff" ? <InsuranceForm',
    replace: "true ? <InsuranceForm",
  },
  // ── Зріз 5, документи згоди (design.md impl-consent-documents, «Тести») ────────────────────────────────────────
  {
    id: "D1", kind: "sql", ac: "AC-DOC-07", file: CONSENT, tests: [CONSENT_DB],
    what: "confirm_hold_impl без перевірки CONSENT_NOT_SIGNED: утримання підтверджується з непідписаним документом",
    find: "  ) then\n    raise exception 'CONSENT_NOT_SIGNED';",
    replace: "  ) and false then\n    raise exception 'CONSENT_NOT_SIGNED';",
  },
  {
    id: "D2", kind: "sql", ac: "AC-DOC-09", file: CONSENT, tests: [CONSENT_DB],
    what: "sign_consent_document_impl без перевірки ролі: документ позначає підписаним будь-хто з входом, зокрема терапевт",
    find: "  if (select auth.uid()) is null or not private.is_staff() then\n    raise exception 'SIGN_FORBIDDEN';",
    replace: "  if (select auth.uid()) is null then\n    raise exception 'SIGN_FORBIDDEN';",
  },
  {
    id: "D3", kind: "sql", ac: "AC-DOC-02", file: CONSENT, tests: [CONSENT_DB],
    what: "без обох бар'єрів «один набір на картку» (unique і перевірка «документи вже є»): повторне формування дає другий набір",
    find: oneSetBlock,
    replace: oneSetBlock.replace(ONE_SET_FROM, "").replace(ONE_SET_GUARD, "if true then").replace(ONE_SET_TO, ";"),
  },
  {
    id: "D4", kind: "ts", ac: "AC-DOC-11", file: CONSENT_PAGE, tests: [CONSENT_PAGE_TEST],
    what: "сторінка документа без redirect(\"/login\"): гість бачить документ замість сторінки входу",
    find: 'if (access === "login") redirect("/login");',
    replace: 'if (access === "login") void 0;',
  },
  {
    id: "D5", kind: "ts", ac: "AC-DOC-09", file: CONSENT_PAGE, tests: [CONSENT_PAGE_TEST],
    what: "сторінка документа пропонує «Mark as signed» і терапевту",
    find: 'doc.signed_at ? null : role === "staff" ? (',
    replace: "doc.signed_at ? null : true ? (",
  },
];
