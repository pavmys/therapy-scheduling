## Purpose

Документи згоди клієнта в його картці: планувальник формує їх англійською за типом клієнта, бачить, яких підписів бракує, позначає документи підписаними, а утримання клієнта зі сформованими документами підтверджується лише тоді, коли всі вони підписані.

## ADDED Requirements

### Requirement: Картка без документів згоди
WHILE для клієнта ще не формували документів згоди, the system SHALL показувати в його картці повідомлення «No consent documents yet.» і жодного документа.

#### Scenario: AC-DOC-01 Картка без документів згоди
- **GIVEN** картку client6 (тип «Adult») створено, і документів згоди для неї ще не формували
- **WHEN** scheduler1 відкриває картку client6
- **THEN** в картці показано повідомлення «No consent documents yet.» і жодного документа

### Requirement: Формування документів згоди за типом клієнта
WHEN планувальник або адміністратор формує документи згоди для клієнта, the system SHALL показати в картці клієнта для типу «Adult» рівно два документи — «Consent to treatment» і «Cancellation policy acknowledgement», а для типу «Child» рівно три — «Consent to treatment», «Cancellation policy acknowledgement» і «Release of information», у цьому порядку й кожен зі станом «Not signed».

#### Scenario: AC-DOC-02 Документи згоди для дорослого клієнта
- **GIVEN** для client6 (тип «Adult») документів згоди ще немає
- **WHEN** scheduler1 формує документи згоди для client6
- **THEN** в картці client6 показано рівно два документи — «Consent to treatment» і «Cancellation policy acknowledgement», кожен зі станом «Not signed»
- **AND** в картці показано рядок «Missing signatures: Consent to treatment, Cancellation policy acknowledgement»

#### Scenario: AC-DOC-03 Документи згоди для дитини з опікуном
- **GIVEN** для client7 (тип «Child», опікун «Guardian Seven») документів згоди ще немає
- **WHEN** scheduler1 формує документи згоди для client7
- **THEN** в картці client7 показано рівно три документи — «Consent to treatment», «Cancellation policy acknowledgement» і «Release of information», кожен зі станом «Not signed»

### Requirement: Текст документа згоди
WHEN користувач, якому дозволено бачити документи згоди клієнта, відкриває документ згоди, the system SHALL показати документ англійською із заголовком документа, рядком «Client: <ім'я клієнта>», для дитини — рядком «Guardian: <ім'я опікуна>», і рядком «Prepared: <дата формування РРРР-ММ-ДД>».

#### Scenario: AC-DOC-04 Документ «Release of information» для дитини
- **GIVEN** scheduler1 сформував документи згоди для client7 (тип «Child», ім'я «Client Seven», опікун «Guardian Seven») 2026-11-04
- **WHEN** scheduler1 відкриває документ «Release of information» client7
- **THEN** він бачить документ англійською із заголовком «Release of information», рядками «Client: Client Seven», «Guardian: Guardian Seven» і «Prepared: 2026-11-04»

### Requirement: Позначка документа підписаним
WHEN планувальник або адміністратор позначає документ згоди підписаним, the system SHALL показувати документ зі станом «Signed <РРРР-ММ-ДД ГГ:ХХ>», а в картці клієнта — рядок «Missing signatures: <непідписані документи через кому в порядку набору>» або, коли непідписаних немає, «All consent documents signed.».

#### Scenario: AC-DOC-05 Підписано один документ із двох
- **GIVEN** обидва документи згоди client6 мають стан «Not signed»
- **WHEN** scheduler1 2026-11-04 о 10:15 позначає «Consent to treatment» підписаним
- **THEN** «Consent to treatment» показано зі станом «Signed 2026-11-04 10:15»
- **AND** рядок у картці — «Missing signatures: Cancellation policy acknowledgement»

#### Scenario: AC-DOC-06 Підписано всі документи
- **GIVEN** «Consent to treatment» client6 має стан «Signed», а «Cancellation policy acknowledgement» — «Not signed»
- **WHEN** scheduler2 позначає «Cancellation policy acknowledgement» підписаним
- **THEN** обидва документи показано зі станом «Signed …»
- **AND** замість рядка «Missing signatures» картка показує «All consent documents signed.»

### Requirement: Утримання не підтверджується без усіх підписів
IF для клієнта сформовано документи згоди, хоча б один із них має стан «Not signed», а за правилами підтвердження зрізу 1 (утримання не прострочене, слот ще не почався, утримання ще не підтверджене, підтверджує планувальник або адміністратор) утримання можна підтвердити, THEN the system SHALL не підтверджувати утримання цього клієнта, показати повідомлення «Sign all consent documents before confirming.» і лишити утримання зі статусом «Held» і тим самим «Held until».

#### Scenario: AC-DOC-07 Підтвердження з непідписаним документом
- **GIVEN** client6 має утримання зі статусом «Held» у therapist1, для client6 сформовано документи згоди, і документ «Cancellation policy acknowledgement» має стан «Not signed»
- **WHEN** scheduler1 пробує підтвердити це утримання
- **THEN** утримання не підтверджується, scheduler1 бачить повідомлення «Sign all consent documents before confirming.»
- **AND** утримання лишається зі статусом «Held» і тим самим «Held until»

### Requirement: Підтвердження утримання після підпису всіх документів
WHEN планувальник або адміністратор підтверджує утримання, яке ще не прострочене, слот якого ще не почався, а всі документи згоди клієнта мають стан «Signed», the system SHALL зробити слот «Confirmed» і більше не показувати «Held until».

#### Scenario: AC-DOC-08 Підтвердження, коли всі документи підписано
- **GIVEN** client6 має утримання зі статусом «Held» у therapist1, утримання ще не прострочене й слот ще не почався, а всі документи згоди client6 мають стан «Signed»
- **WHEN** scheduler1 підтверджує це утримання
- **THEN** слот має статус «Confirmed», а «Held until» більше не показано

### Requirement: Терапевт не позначає документи підписаними
IF терапевт відкриває документ згоди свого клієнта, THEN the system SHALL показати документ і його стан, не пропонувати позначити його підписаним, показати повідомлення «Only schedulers and admins can mark documents as signed.» і не змінювати стан документа.

#### Scenario: AC-DOC-09 Терапевт відкриває документ свого клієнта
- **GIVEN** client6 — свій клієнт therapist1, і документ «Consent to treatment» client6 має стан «Not signed»
- **WHEN** therapist1 відкриває цей документ за прямим посиланням
- **THEN** він бачить документ і стан «Not signed», позначити його підписаним йому не запропоновано — замість цього він бачить повідомлення «Only schedulers and admins can mark documents as signed.»
- **AND** scheduler1 після цього бачить у документа той самий стан «Not signed»

### Requirement: Терапевт не бачить документів чужих клієнтів
IF терапевт відкриває документ згоди клієнта, який не є його клієнтом, THEN the system SHALL показати повідомлення «You don't have access to this client.», не показувати жодного тексту документа чи даних клієнта й не змінювати стан документа.

#### Scenario: AC-DOC-10 Терапевт відкриває документ чужого клієнта
- **GIVEN** client9 — свій клієнт лише для therapist2, і для client9 сформовано документи згоди
- **WHEN** therapist1 відкриває документ «Consent to treatment» client9 за прямим посиланням
- **THEN** therapist1 бачить повідомлення «You don't have access to this client.», жодного тексту документа чи даних client9 не показано
- **AND** стан документа не змінився

### Requirement: Без входу документ не показано
IF користувач, який не увійшов у застосунок, відкриває документ згоди за прямим посиланням, THEN the system SHALL показати лише сторінку входу, не показувати тексту документа й даних клієнта і не змінювати стан документа.

#### Scenario: AC-DOC-11 Документ за прямим посиланням без входу
- **GIVEN** користувач не увійшов у застосунок, а для client6 сформовано документи згоди
- **WHEN** він відкриває документ «Consent to treatment» client6 за прямим посиланням
- **THEN** він бачить лише сторінку входу, тексту документа й даних client6 не показано
- **AND** стан документа не змінився
