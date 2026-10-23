# client-cards Specification

## Purpose
Картка клієнта з іменем і email, яку створює планувальник або адміністратор, щоб утримати за клієнтом слот терапевта.

## Requirements

### Requirement: Створення картки клієнта
WHEN планувальник або адміністратор створює клієнта з непорожнім іменем і коректним email, якого ще немає, the system SHALL створити картку клієнта, яку можна вибрати під час утримання слоту.

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
