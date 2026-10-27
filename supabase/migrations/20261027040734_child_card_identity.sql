-- Дублікат картки дитини (уточнення PM 2026-10-26, AC-CARD-13; відповідь на Sofiia-pm/therapy-scheduling-spec#23):
-- та сама дитина — те саме ім'я без урахування великих і малих літер і пробілів по краях, та сама дата народження
-- й той самий email опікуна. Діти з одним опікуном і різними іменами (близнюки) — різні картки.
-- Унікальний індекс — останній рубіж і для одночасних запитів; Server Action мапить порушення в текст PM.
-- Ім'я вже зберігається без пробільних символів по краях (clients_full_name_check), email опікуна — малими літерами
-- без пробілів (clients_card_shape_check), тож у ключі досить lower(full_name). Наявні картки дітей перевірено:
-- дублікатів за цим ключем немає.
create unique index clients_child_identity_key
  on public.clients (lower(full_name), date_of_birth, guardian_email)
  where client_type = 'child';
