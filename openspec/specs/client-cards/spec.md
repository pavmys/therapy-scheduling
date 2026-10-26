# client-cards Specification

## Purpose
Картка клієнта з іменем і email, яку створює планувальник або адміністратор, щоб утримати за клієнтом слот терапевта.

## Requirements

### Requirement: Створення картки клієнта
WHEN планувальник або адміністратор створює клієнта з непорожнім іменем і коректним email, якого ще немає, повною формою картки, де решта полів заповнена правильно, the system SHALL створити картку клієнта, яку можна вибрати під час утримання слоту.

#### Scenario: AC-HOLD-10 Створення клієнта з іменем і email
- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «Client Three» і email client3@example.test
- **THEN** картку клієнта створено
- **AND** його можна вибрати під час утримання слоту

### Requirement: Перевірка імені та email клієнта
IF ім'я клієнта порожнє або лише з пробілів, або email після прибирання пробілів на початку й у кінці не містить рівно один «@» з непорожніми частинами до й після нього та крапкою в частині після «@» чи має пробіли всередині, THEN the system SHALL не створювати клієнта й показати повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-11 Порожнє ім'я клієнта
- **GIVEN** планувальник створює клієнта
- **WHEN** ім'я залишено порожнім, а email — client3@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-15 Email без знака @
- **GIVEN** планувальник створює клієнта
- **WHEN** ім'я — «Client Three», а email — «client3example.test» (без знака @)
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-39 Некоректні форми email
- **GIVEN** клієнта з таким email ще немає
- **WHEN** планувальник створює клієнта «Client Three» з email «client3@example» (без крапки після «@»), «client3@@example.test» (два «@»), «@example.test» (порожня частина до «@») або «client 3@example.test» (пробіл усередині)
- **THEN** у кожному випадку клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

### Requirement: Унікальний email клієнта
IF клієнт з тим самим email уже існує, без урахування великих і малих літер та пробілів на початку й у кінці, THEN the system SHALL не створювати клієнта й показати повідомлення «A client with this email already exists.»

#### Scenario: AC-HOLD-16 Дублікат email
- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює ще одного клієнта з email client1@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»

#### Scenario: AC-HOLD-34 Дублікат email з іншим регістром і пробілами
- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює клієнта «Client One» з email « Client1@Example.TEST » (з великими літерами й пробілами на початку та в кінці)
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»

### Requirement: Нормалізація email клієнта
WHEN планувальник або адміністратор створює клієнта, the system SHALL зберігати й показувати email клієнта малими літерами без пробілів на початку й у кінці.

#### Scenario: AC-HOLD-35 Email зберігається малими літерами без пробілів
- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта «Client Three» з email « Client3@Example.TEST »
- **THEN** клієнта створено
- **AND** у картці клієнта та під час утримання його email показано як client3@example.test

### Requirement: Нормалізація імені клієнта
WHEN планувальник або адміністратор створює клієнта, the system SHALL зберігати й показувати ім'я клієнта без пробілів на початку й у кінці, а ім'я лише з пробілів вважати порожнім.

#### Scenario: AC-HOLD-41 Ім'я з пробілами
- **GIVEN** клієнтів з email client4@example.test і client5@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «   » (лише пробіли) і email client5@example.test, а потім клієнта з іменем « Client Four » і email client4@example.test
- **THEN** першого клієнта не створено, і планувальник бачить повідомлення «Enter the client's name and a valid email.»
- **AND** другого створено, і в картці його ім'я показано як «Client Four»

### Requirement: Картка дорослого клієнта з анкети
WHEN планувальник або адміністратор створює картку з типом «Adult», ім'ям, email, датою народження й мовою сеансів, the system SHALL створити картку з усіма цими даними, яку можна вибрати під час утримання слоту.

#### Scenario: AC-CARD-01 Картка дорослого клієнта
- **GIVEN** клієнта з email client6@example.test ще немає
- **WHEN** scheduler1 створює картку з типом «Adult», ім'ям «Client Six», email client6@example.test, датою народження 1990-05-14 і мовою сеансів «English»
- **THEN** картку створено, і в ній показано всі ці дані
- **AND** client6 можна вибрати під час утримання слоту

### Requirement: Картка дитини з опікуном
WHEN планувальник або адміністратор створює картку з типом «Child», ім'ям, датою народження, мовою сеансів, ім'ям та email опікуна, the system SHALL створити картку з даними дитини й опікуна, а під час утримання слоту знаходити дитину й за email опікуна і показувати біля неї email опікуна.

#### Scenario: AC-CARD-02 Картка дитини з опікуном
- **GIVEN** опікуна з email guardian7@example.test ще не вказано в жодній картці
- **WHEN** scheduler1 створює картку з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02, мовою сеансів «Spanish», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** картку створено, і в ній показано дані дитини й опікуна
- **AND** під час утримання слоту client7 можна знайти за email опікуна guardian7@example.test, і біля client7 показано email опікуна

### Requirement: Дані опікуна обов'язкові в картці дитини
IF у картці з типом «Child» ім'я опікуна порожнє або email опікуна порожній чи некоректний, THEN the system SHALL не створювати картку, показати повідомлення «Enter the guardian's name and a valid email.» і залишити всі введені дані у формі.

#### Scenario: AC-CARD-03 Порожнє ім'я або email опікуна
- **GIVEN** scheduler1 заповнює картку з типом «Child», ім'ям «Client Eight», датою народження 2016-01-10 і мовою «English»
- **WHEN** ім'я або email опікуна залишено порожнім і scheduler1 зберігає картку
- **THEN** картку не створено, і scheduler1 бачить повідомлення «Enter the guardian's name and a valid email.»
- **AND** усі введені дані лишаються у формі

### Requirement: Терапевт бачить лише своїх клієнтів
WHEN терапевт відкриває список своїх клієнтів, the system SHALL показувати картки лише тих клієнтів, у яких з цим терапевтом є утримання зі статусом «Held», слот якого ще не почався, або сеанс зі статусом «Confirmed» (зокрема минулий), з усіма даними анкети, а в картці дитини — з даними опікуна.

#### Scenario: AC-CARD-04 Список своїх клієнтів терапевта
- **GIVEN** зараз 2026-11-02 12:00, client6 має утримання зі статусом «Held» у therapist1 на 2026-11-05 о 10:00, client7 — сеанс зі статусом «Confirmed» у therapist1 2026-11-04 о 10:00, а client9 — утримання зі статусом «Held» у therapist2 на 2026-11-05 об 11:00
- **WHEN** therapist1 відкриває список своїх клієнтів
- **THEN** він бачить картки client6 і client7 з усіма даними анкети (для client7 — з даними опікуна)
- **AND** не бачить client9

### Requirement: Картка чужого клієнта недоступна терапевту
IF терапевт відкриває картку клієнта, який не є його клієнтом (зокрема, коли утримання клієнта з ним прострочилось і інших утримань чи сеансів з ним немає), THEN the system SHALL не показувати клієнта в списку терапевта, а за прямим посиланням показати повідомлення «You don't have access to this client.» без жодних даних клієнта.

#### Scenario: AC-CARD-05 Чужа картка за прямим посиланням
- **GIVEN** client9 — свій клієнт лише для therapist2
- **WHEN** therapist1 відкриває картку client9 за прямим посиланням
- **THEN** therapist1 бачить повідомлення «You don't have access to this client.», і жодних даних client9 не показано
- **AND** картка client9 не змінилася

#### Scenario: AC-CARD-08 Прострочене утримання не робить клієнта своїм
- **GIVEN** утримання client6 у therapist1 має статус «Expired», і інших утримань чи сеансів client6 з therapist1 немає
- **WHEN** therapist1 відкриває список своїх клієнтів, а потім картку client6 за прямим посиланням
- **THEN** client6 у списку немає
- **AND** за посиланням therapist1 бачить повідомлення «You don't have access to this client.» і жодних даних client6

### Requirement: Терапевт не створює картки клієнтів
IF терапевт відкриває форму нової картки за прямим посиланням або пробує створити картку в обхід цієї сторінки, THEN the system SHALL не показувати форму, одразу показати повідомлення «Only schedulers and admins can create client cards.» і не створювати картку.

#### Scenario: AC-CARD-06 Терапевт пробує створити картку
- **GIVEN** therapist1 увійшов у застосунок
- **WHEN** він відкриває форму нової картки клієнта за прямим посиланням
- **THEN** форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.»
- **AND** кількість карток клієнтів не змінилася

### Requirement: Порожній список клієнтів терапевта
IF у терапевта немає жодного утримання зі статусом «Held» і жодного сеансу зі статусом «Confirmed», THEN the system SHALL показати в списку його клієнтів повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.» і жодної картки.

#### Scenario: AC-CARD-09 Терапевт без клієнтів
- **GIVEN** therapist2 не має жодного утримання зі статусом «Held» і жодного сеансу зі статусом «Confirmed»
- **WHEN** therapist2 відкриває список своїх клієнтів
- **THEN** він бачить повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.»
- **AND** не бачить жодної картки

### Requirement: Планувальник і адміністратор бачать усі картки
WHEN планувальник або адміністратор відкриває список клієнтів, the system SHALL показувати всі картки клієнтів, а в картці дитини — дані опікуна.

#### Scenario: AC-CARD-10 Усі картки для планувальника й адміністратора
- **GIVEN** існують картки client6, client7 і client9
- **WHEN** scheduler2 або admin1 відкриває список клієнтів
- **THEN** кожен із них бачить усі три картки
- **AND** у картці client7 — дані опікуна

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
