# Spec Delta

## MODIFIED Requirements

### Requirement: Створення картки клієнта
WHEN планувальник або адміністратор створює клієнта з непорожнім іменем і коректним email, якого ще немає, повною формою картки, де решта полів заповнена правильно, the system SHALL створити картку клієнта, яку можна вибрати під час утримання слоту.

#### Scenario: AC-HOLD-10 Створення клієнта з іменем і email
- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «Client Three» і email client3@example.test
- **THEN** картку клієнта створено
- **AND** його можна вибрати під час утримання слоту

### Requirement: Картка дитини з опікуном
WHEN планувальник або адміністратор створює картку з типом «Child», ім'ям, датою народження, мовою сеансів, ім'ям та email опікуна, the system SHALL створити картку з даними дитини й опікуна, а під час утримання слоту знаходити дитину й за email опікуна і показувати біля неї email опікуна.

#### Scenario: AC-CARD-02 Картка дитини з опікуном
- **GIVEN** опікуна з email guardian7@example.test ще не вказано в жодній картці
- **WHEN** scheduler1 створює картку з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02, мовою сеансів «Spanish», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** картку створено, і в ній показано дані дитини й опікуна
- **AND** під час утримання слоту client7 можна знайти за email опікуна guardian7@example.test, і біля client7 показано email опікуна

### Requirement: Терапевт бачить лише своїх клієнтів
WHEN терапевт відкриває список своїх клієнтів, the system SHALL показувати картки лише тих клієнтів, у яких з цим терапевтом є утримання зі статусом «Held», слот якого ще не почався, або сеанс зі статусом «Confirmed» (зокрема минулий), з усіма даними анкети, а в картці дитини — з даними опікуна.

#### Scenario: AC-CARD-04 Список своїх клієнтів терапевта
- **GIVEN** зараз 2026-11-02 12:00, client6 має утримання зі статусом «Held» у therapist1 на 2026-11-05 о 10:00, client7 — сеанс зі статусом «Confirmed» у therapist1 2026-11-04 о 10:00, а client9 — утримання зі статусом «Held» у therapist2 на 2026-11-05 об 11:00
- **WHEN** therapist1 відкриває список своїх клієнтів
- **THEN** він бачить картки client6 і client7 з усіма даними анкети (для client7 — з даними опікуна)
- **AND** не бачить client9

### Requirement: Терапевт не створює картки клієнтів
IF терапевт відкриває форму нової картки за прямим посиланням або пробує створити картку в обхід цієї сторінки, THEN the system SHALL не показувати форму, одразу показати повідомлення «Only schedulers and admins can create client cards.» і не створювати картку.

#### Scenario: AC-CARD-06 Терапевт пробує створити картку
- **GIVEN** therapist1 увійшов у застосунок
- **WHEN** він відкриває форму нової картки клієнта за прямим посиланням
- **THEN** форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.»
- **AND** кількість карток клієнтів не змінилася

### Requirement: Порожній список клієнтів терапевта
IF у терапевта немає жодного свого клієнта — утримання зі статусом «Held», слот якого ще не почався, чи сеансу зі статусом «Confirmed» (AC-CARD-14), THEN the system SHALL показати в списку його клієнтів повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.» і жодної картки.

#### Scenario: AC-CARD-09 Терапевт без клієнтів
- **GIVEN** therapist2 не має жодного утримання зі статусом «Held» і жодного сеансу зі статусом «Confirmed»
- **WHEN** therapist2 відкриває список своїх клієнтів
- **THEN** він бачить повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.»
- **AND** не бачить жодної картки

## ADDED Requirements

### Requirement: Помилки форми картки біля кожного поля
IF у формі картки клієнта є помилки, THEN the system SHALL не створювати картку, одразу показати всі повідомлення, кожне біля свого поля, і залишити всі введені дані у формі.

#### Scenario: AC-CARD-12 Кілька помилок одразу
- **GIVEN** сьогодні 2026-11-03
- **WHEN** scheduler1 створює картку з типом «Child», порожнім ім'ям, датою народження 2026-11-04, без мови сеансів, з ім'ям опікуна «Guardian Eight» і email опікуна guardian8@example.test
- **THEN** картку не створено, scheduler1 одразу бачить три повідомлення біля відповідних полів — «Enter the client's name.», «Enter a date of birth that is not in the future.» і «Select a session language.»
- **AND** всі введені дані лишаються у формі

### Requirement: Дублікат картки дитини
IF уже є картка дитини з тим самим ім'ям (без урахування великих і малих літер та пробілів на початку й у кінці), датою народження й email опікуна, THEN the system SHALL не створювати нову картку, показати повідомлення «A client with these details already exists.» і залишити введені дані у формі.

#### Scenario: AC-CARD-13 Повторна картка дитини
- **GIVEN** є картка client7 з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02 і email опікуна guardian7@example.test
- **WHEN** scheduler2 створює картку з типом «Child», ім'ям « client seven », датою народження 2015-03-02, мовою сеансів «English», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** другу картку не створено, scheduler2 бачить повідомлення «A client with these details already exists.»
- **AND** введені дані лишаються у формі

### Requirement: Свій клієнт — до початку слоту утримання або після сеансу
WHEN слот утримання «Held» уже почався, the system SHALL більше не вважати клієнта своїм для терапевта через це утримання (картка недоступна, за прямим посиланням — «You don't have access to this client.»), а сеанс зі статусом «Confirmed» SHALL лишати клієнта своїм без обмеження в часі.

#### Scenario: AC-CARD-14 Межа початку слоту й минулий сеанс
- **GIVEN** слот therapist1 2026-11-03 о 10:00 утримано за client6 2026-11-02 о 14:30 зі статусом «Held», client7 мав сеанс зі статусом «Confirmed» у therapist1 2026-11-02 о 10:00, і інших утримань чи сеансів client6 і client7 з therapist1 немає
- **WHEN** therapist1 відкриває список своїх клієнтів 2026-11-03 о 09:59, а потім о 10:00 або пізніше
- **THEN** о 09:59 він бачить картки client6 і client7, а з 10:00 — лише картку client7
- **AND** за прямим посиланням на картку client6 therapist1 бачить повідомлення «You don't have access to this client.» і жодних даних client6

### Requirement: Порожній список клієнтів для планувальника й адміністратора
IF у практиці ще немає жодної картки клієнта, THEN the system SHALL показати планувальнику й адміністратору замість списку повідомлення «No clients yet. Create a client card from an intake form.», а форма нової картки SHALL лишатися доступною.

#### Scenario: AC-CARD-15 Ще немає жодної картки
- **GIVEN** у практиці ще немає жодної картки клієнта
- **WHEN** scheduler1 або admin1 відкриває список клієнтів
- **THEN** замість списку він бачить повідомлення «No clients yet. Create a client card from an intake form.»
- **AND** форма нової картки доступна, як завжди

### Requirement: Посилання на картку, якої немає
IF картки клієнта, на яку веде посилання, не існує, THEN the system SHALL показати планувальнику й адміністратору повідомлення «This client card doesn't exist.», терапевту — «You don't have access to this client.», і нікому не показувати жодних даних клієнтів.

#### Scenario: AC-CARD-16 Неіснуюча картка для різних ролей
- **GIVEN** картки клієнта, на яку веде посилання, не існує
- **WHEN** scheduler1, а потім therapist1 відкриває це посилання
- **THEN** scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.»
- **AND** жоден із них не бачить жодних даних клієнтів
