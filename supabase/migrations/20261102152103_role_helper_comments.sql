-- Описи хелперів ролей для тих, хто читає схему (Supabase Studio, psql \df+). Логіка без змін.

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(private.current_app_role() in ('admin', 'scheduler'), false);
$$;

comment on function private.is_staff() is
  'Планувальник або адміністратор: однакові права на картки, слоти й утримання. Для аноніма й користувача без ролі — false.';
comment on function private.current_app_role() is
  'Роль поточного користувача з profiles.role; NULL, якщо профілю чи ролі немає.';
