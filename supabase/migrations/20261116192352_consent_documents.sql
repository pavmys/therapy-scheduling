-- Документи згоди клієнта (зріз 5; openspec/changes/impl-consent-documents/design.md, D1–D4; задача 1 — лише база, без UI).
-- AC: AC-DOC-07, AC-DOC-08 (підтвердження з документами); основа для AC-DOC-01…06, AC-DOC-09…11 (задачі 2–3).
-- Порядок розгортання: перевірка підписів у confirm_hold з'являється на проді раніше, ніж UI формування документів.

-- ── D1. Таблиця ─────────────────────────────────────────────────────────────
-- Один документ кожного типу на картку: unique (client_id, kind) — другого набору не буде навіть при двох
-- одночасних формуваннях («Припущення» PM). Назви, порядок і сталий текст — у коді (src/lib/consent/documents.ts).
create table public.consent_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null,
  prepared_on date not null,
  signed_at timestamptz,
  signed_by uuid references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  constraint consent_documents_kind_check
    check (kind in ('consent_to_treatment', 'cancellation_policy', 'release_of_information')),
  constraint consent_documents_client_kind_key unique (client_id, kind),
  constraint consent_documents_signed_check check ((signed_at is null) = (signed_by is null))
);

comment on table public.consent_documents is
  'Документи згоди клієнта (AC-DOC-01…11). Запис — лише функціями prepare_consent_documents і sign_consent_document.';

alter table public.consent_documents enable row level security;
revoke all on table public.consent_documents from anon, authenticated;
-- Лише читання; insert / update / delete для authenticated немає — запис функціями нижче.
grant select on table public.consent_documents to authenticated;
-- Серверні скрипти й прибирання UAT працюють із секретним ключем як service_role — як для інших таблиць.
grant select, insert, update, delete on table public.consent_documents to service_role;

-- Staff бачить документи всіх карток; терапевт — лише своїх клієнтів (та сама межа, що й для картки; ADR 0005).
create policy consent_documents_select_staff
  on public.consent_documents
  for select
  to authenticated
  using ((select private.is_staff()));

create policy consent_documents_select_own_therapist
  on public.consent_documents
  for select
  to authenticated
  using (
    (select private.current_app_role()) = 'therapist'
    and (select private.is_own_client(consent_documents.client_id))
  );

-- ── D2. Формування документів (AC-DOC-02, AC-DOC-03) ───────────────────────
-- Блокування картки серіалізує одночасні формування; документи вже є — повертаємо наявні без змін
-- (повідомлення другому планувальнику — Q8, HryhoriiHaponiukQuitCode/therapy-scheduling-spec#38).
create or replace function private.prepare_consent_documents_impl(p_client_id uuid)
returns setof public.consent_documents
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_client_type text;
  v_today date;
begin
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'CONSENT_FORBIDDEN';
  end if;

  select c.client_type into v_client_type from public.clients as c where c.id = p_client_id for update;
  if not found then
    raise exception 'CLIENT_NOT_FOUND';
  end if;

  if not exists (select 1 from public.consent_documents as d where d.client_id = p_client_id) then
    -- Дата формування — у часовому поясі практики («Припущення» PM).
    v_today := (pg_catalog.clock_timestamp() at time zone 'America/Los_Angeles')::date;

    insert into public.consent_documents (client_id, kind, prepared_on, created_by)
    select p_client_id, k.kind, v_today, (select auth.uid())
    from (
      values ('consent_to_treatment'), ('cancellation_policy'), ('release_of_information')
    ) as k (kind)
    where k.kind <> 'release_of_information' or v_client_type = 'child'
    on conflict (client_id, kind) do nothing;
  end if;

  return query
    select d.* from public.consent_documents as d where d.client_id = p_client_id;
end;
$$;

revoke execute on function private.prepare_consent_documents_impl(uuid) from public, anon;
grant execute on function private.prepare_consent_documents_impl(uuid) to authenticated;

create or replace function public.prepare_consent_documents(p_client_id uuid)
returns setof public.consent_documents
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.prepare_consent_documents_impl(p_client_id);
$$;

revoke execute on function public.prepare_consent_documents(uuid) from public, anon;
grant execute on function public.prepare_consent_documents(uuid) to authenticated;

-- ── D3. Позначка «підписано» (AC-DOC-05, AC-DOC-06, AC-DOC-09) ─────────────
-- Час підпису — серверний, з точністю до хвилини; повторна позначка не перезаписує час першого підпису
-- (повідомлення другому — Q7, HryhoriiHaponiukQuitCode/therapy-scheduling-spec#37).
create or replace function private.sign_consent_document_impl(p_document_id uuid)
returns public.consent_documents
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_document public.consent_documents;
begin
  -- Терапевт, анонім і користувач без ролі — відмова, стан документа не змінюється (AC-DOC-09).
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'SIGN_FORBIDDEN';
  end if;

  select * into v_document from public.consent_documents where id = p_document_id for update;
  if not found then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;

  if v_document.signed_at is null then
    update public.consent_documents
    set signed_at = pg_catalog.date_trunc('minute', pg_catalog.clock_timestamp()),
        signed_by = (select auth.uid())
    where id = p_document_id
    returning * into v_document;
  end if;

  return v_document;
end;
$$;

revoke execute on function private.sign_consent_document_impl(uuid) from public, anon;
grant execute on function private.sign_consent_document_impl(uuid) to authenticated;

create or replace function public.sign_consent_document(p_document_id uuid)
returns public.consent_documents
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.sign_consent_document_impl(p_document_id);
$$;

revoke execute on function public.sign_consent_document(uuid) from public, anon;
grant execute on function public.sign_consent_document(uuid) to authenticated;

-- ── D4. Підтвердження з документами (AC-DOC-07, AC-DOC-08) ─────────────────
-- Та сама функція, що в 20261022063605_confirm_hold.sql: ті самі перевірки зрізу 1 у тому самому порядку
-- (роль, утримання є, уже підтверджене, прострочене, слот почався) — і лише ПІСЛЯ них документи згоди
-- («Припущення» PM; slot-holds після align-consent-documents). Документів немає — як у зрізі 1
-- (AC-HOLD-12, -23, -27). SET search_path з попереднього визначення не зберігається — пишемо знову.
create or replace function private.confirm_hold_impl(p_hold_id uuid)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hold public.holds;
  v_starts_at timestamptz;
  v_now timestamptz;
begin
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'CONFIRM_FORBIDDEN';
  end if;

  select * into v_hold from public.holds where id = p_hold_id for update;
  if not found then
    raise exception 'HOLD_NOT_FOUND';
  end if;

  v_now := pg_catalog.clock_timestamp();

  if v_hold.confirmed_at is not null then
    raise exception 'HOLD_ALREADY_CONFIRMED';
  end if;

  if v_now >= v_hold.expires_at then
    raise exception 'HOLD_EXPIRED';
  end if;

  select s.starts_at into v_starts_at from public.slots as s where s.id = v_hold.slot_id;
  if v_now >= v_starts_at then
    raise exception 'SLOT_STARTED_CONFIRM';
  end if;

  -- Сформовано документи, і хоча б один не підписано — утримання лишається «Held» з тим самим
  -- expires_at: виняток відкочує транзакцію (AC-DOC-07). Усі підписані — підтверджуємо (AC-DOC-08).
  if exists (
    select 1
    from public.consent_documents as d
    where d.client_id = v_hold.client_id
      and d.signed_at is null
  ) then
    raise exception 'CONSENT_NOT_SIGNED';
  end if;

  update public.holds
  set confirmed_at = v_now
  where id = p_hold_id
  returning * into v_hold;

  return v_hold;
end;
$$;

revoke execute on function private.confirm_hold_impl(uuid) from public, anon;
grant execute on function private.confirm_hold_impl(uuid) to authenticated;
