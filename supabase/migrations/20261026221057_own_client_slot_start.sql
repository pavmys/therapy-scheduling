-- «Свій клієнт» — утримання «Held» лише до початку його слоту (уточнення PM 2026-10-26, AC-CARD-14, AC-CARD-04;
-- відповідь на Sofiia-pm/therapy-scheduling-spec#25). Минулий сеанс «Confirmed» лишає клієнта своїм без обмеження.
-- Раніше «Held» давав доступ до кінця 24 годин, зокрема після початку слоту (утримання, створене за кілька годин до
-- слоту, прострочується вже після його початку). Застосовану міграцію own_clients не змінюємо — лише нова функція з
-- тією самою сигнатурою; права (revoke … from public, anon; grant … to authenticated) create or replace зберігає.
create or replace function private.is_own_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.holds as h
    join public.slots as s on s.id = h.slot_id
    where h.client_id = p_client_id
      and s.therapist_id = (select auth.uid())
      and (
        h.confirmed_at is not null
        or (h.expires_at > now() and now() < s.starts_at)
      )
  );
$$;
