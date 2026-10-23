-- Правила картки клієнта з уточнень PM (знімок вимог 2026-10-23, зміна специфікації clarify-hold).
-- Ті самі правила, що в src/lib/clients/validate.ts, — останній рубіж для прямого insert.
-- AC: AC-HOLD-39, AC-HOLD-41. Наявні дані перевірено перед міграцією: усі рядки відповідають новим правилам.

-- Коректний email: рівно один «@», непорожня частина до нього, крапка в частині після «@»,
-- без пробілів; зберігається малими літерами без пробілів по краях (AC-HOLD-35, AC-HOLD-39).
alter table public.clients drop constraint clients_email_check;
alter table public.clients add constraint clients_email_check check (
  email = lower(btrim(email))
  and email ~ '^[^@[:space:]]+@[^@[:space:].]*\.[^@[:space:]]*$'
);

-- Ім'я зберігається без пробільних символів по краях; лише з них — порожнє (AC-HOLD-11, AC-HOLD-41).
-- [[:space:]], а не btrim(): btrim прибирає лише пробіли, а застосунок (trim) — і табуляції, переноси тощо.
alter table public.clients drop constraint clients_full_name_check;
alter table public.clients add constraint clients_full_name_check check (
  full_name ~ '[^[:space:]]'
  and full_name !~ '^[[:space:]]|[[:space:]]$'
);
