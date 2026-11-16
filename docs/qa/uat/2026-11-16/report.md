# Звіт UAT — 16.11.2026

- **Застосунок:** https://therapy-scheduling-three.vercel.app (/api/health: коміт `baa487e`)
- **Код тестів:** `task/intake-eval-uat` @ `95b67e9`
- **Прогін:** 16.11.2026, 17:28 (Київ), Playwright 84.1 с; AC: 11 — PASS 11, FAIL 0, NEEDS-HUMAN 0
- **Рецензент:** `claude-haiku-5-5`; суперечки → `claude-sonnet-5-5`. Разом за розбір: $0.0979 (ціни API; за підпискою — у межах ліміту плану)
- **Прибирання:** синтетичних uat-*@example.test видалено 6, лишилось 0, їхніх рядків, що лишились: 0
- **Відео й траси:** не в git — `test-results/` локально або артефакт CI; трасу відкриває `npx playwright show-trace <trace.zip>`

| AC | Перевірки | Агент | Підсумок | Чому | Playwright | Розбір |
|---|---|---|---|---|---|---|
| AC-CARD-06 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 5.6 с | $0.0023, 10.2 с |
| AC-CARD-07 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 8.4 с | $0.0031, 10.8 с |
| AC-CARD-16 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 3.1 с | $0.0023, 6.4 с |
| AC-INS-01 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 3.8 с | $0.0018, 5.8 с |
| AC-INS-02 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 7.1 с | $0.0026, 8.7 с |
| AC-INS-03 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 8.1 с | $0.0025, 7.9 с |
| AC-INS-04 | пройшли | Haiku: NEEDS-HUMAN, Sonnet: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 3.8 с | $0.0333, 16.6 с |
| AC-INS-05 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 5.3 с | $0.0019, 6.4 с |
| AC-INS-06 | пройшли | Haiku: NEEDS-HUMAN, Sonnet: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 3.7 с | $0.0438, 23.7 с |
| AC-INTAKE-03 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 14.9 с | $0.0019, 6.2 с |
| AC-INTAKE-06 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 7.0 с | $0.0023, 10.1 с |

## AC-CARD-06 — PASS

**Тест:** AC-CARD-06: терапевт за прямим посиланням на нову картку бачить лише відмову, кількість карток не змінилась

**Критерій** (requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md):

> AC-CARD-06: Дано therapist1 увійшов у застосунок. Коли він відкриває форму нової картки клієнта за прямим посиланням. Тоді форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася.

![Кадр «Тоді» 1](frames/AC-CARD-06-then-1.png)

**Кроки:** ✔ Дано: therapist1 увійшов у застосунок → ✔ Коли: він відкриває форму нової картки клієнта за прямим посиланням → ✔ Тоді: форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1.png сторінка «New client card» показує лише повідомлення «Only schedulers and admins can create client cards.» з іконкою замка; текст збігається з критерієм посимвольно. Полів анкети й кнопки створення на кадрі немає. Частина про відсутність форми встановлена візуально, бо в кадрі немає тексту, який можна було б процитувати; дві «не з кадрів» частини не оцінювались.

**Цитати агента, звірені зі сторінкою (aria):**
- «Only schedulers and admins can create client cards.» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-cards-терапевт-AC-C-7cc32-лькість-карток-не-змінилась-chromium/video.webm` · **траса:** `test-results/artifacts/client-cards-терапевт-AC-C-7cc32-лькість-карток-не-змінилась-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-CARD-06 — …») · @login: ____

## AC-CARD-07 — PASS

**Тест:** AC-CARD-07: без входу за прямим посиланням на клієнтів, картку client6 чи утримання — лише сторінка входу

**Критерій** (requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md):

> AC-CARD-07: Дано користувач не увійшов у застосунок. Коли він відкриває за прямим посиланням список клієнтів, картку client6 або список утримань. Тоді він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано, і жодна картка не змінилася.

![Кадр «Тоді» 1](frames/AC-CARD-07-then-1.png)
![Кадр «Тоді» 2](frames/AC-CARD-07-then-2.png)
![Кадр «Тоді» 3](frames/AC-CARD-07-then-3.png)

**Кроки:** ✔ Дано: користувач не увійшов у застосунок → ✔ Коли: він відкриває за прямим посиланням список клієнтів → ✔ Тоді: він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано → ✔ Коли: він відкриває за прямим посиланням картку client6 → ✔ Тоді: він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано → ✔ Коли: він відкриває за прямим посиланням список утримань → ✔ Тоді: він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано, і жодна картка не змінилася

**Агент (claude-haiku-5-5, PASS):** Усі три кадри (frame-then-1, -2, -3) показують однакову сторінку входу: заголовок «Вхід», поля Email і Пароль та кнопку «Увійти» і більше нічого. Відсутність даних клієнтів чи утримань зафіксовано тим, що на кадрах немає жодного іншого вмісту; «жодна картка не змінилася» кадри не показують і в видимі частини не входить.

**Цитати агента, звірені зі сторінкою (aria):**
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-cards-без-входу-AC--66889-мання-—-лише-сторінка-входу-chromium/video.webm` · **траса:** `test-results/artifacts/client-cards-без-входу-AC--66889-мання-—-лише-сторінка-входу-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-CARD-07 — …») · @login: ____

## AC-CARD-16 — PASS

**Тест:** AC-CARD-16: посилання на картку, якої немає — scheduler1 бачить «This client card doesn't exist.», therapist1 — «You don't have access to this client.»

**Критерій** (requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md):

> AC-CARD-16: Дано картки клієнта, на яку веде посилання, не існує. Коли scheduler1, а потім therapist1 відкриває це посилання. Тоді scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів.

![Кадр «Тоді» 1](frames/AC-CARD-16-then-1.png)
![Кадр «Тоді» 2](frames/AC-CARD-16-then-2.png)

**Кроки:** ✔ Дано: картки клієнта, на яку веде посилання, не існує → ✔ Коли: scheduler1 відкриває це посилання → ✔ Тоді: scheduler1 бачить повідомлення «This client card doesn't exist.» → ✔ Коли: потім therapist1 відкриває це посилання → ✔ Тоді: therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів

**Агент (claude-haiku-5-5, PASS):** На frame-then-1 (scheduler1) видно «This client card doesn't exist.» у рамці з іконкою замка, а нижче немає жодних полів картки. На frame-then-2 (therapist1) видно «You don't have access to this client.» і так само немає жодних даних клієнта. Кадри чіткі, повні, без завантаження. Частина про email не з кадрів не оцінювалась.

**Цитати агента, звірені зі сторінкою (aria):**
- «This client card doesn't exist.» — є на сторінці
- «Client card» — є на сторінці
- «Slots» — є на сторінці
- «Holds» — є на сторінці
- «Clients» — є на сторінці
- «scheduler1@example.test» — є на сторінці
- «Sign out» — є на сторінці
- «This client card doesn't exist.» — є на сторінці
- «You don't have access to this client.» — є на сторінці
- «Client card» — є на сторінці
- «My schedule» — є на сторінці
- «My clients» — є на сторінці
- «therapist1@example.test» — є на сторінці
- «Sign out» — є на сторінці
- «You don't have access to this client.» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-cards-планувальник--08582-ave-access-to-this-client-»-chromium/video.webm` · **траса:** `test-results/artifacts/client-cards-планувальник--08582-ave-access-to-this-client-»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-CARD-16 — …») · @login: ____

## AC-INS-01 — PASS

**Тест:** AC-INS-01: нова картка, статус страхування ще ніхто не позначав — scheduler1 бачить «Insurance: Not set»

**Критерій** (requirements/33-planuvalnyk-status-perevirky-strakhuvannia.md):

> AC-INS-01: Дано картку client6 створено, і статус перевірки страхування ще ніхто не позначав. Коли scheduler1 відкриває картку client6. Тоді в картці показано «Insurance: Not set».

![Кадр «Тоді» 1](frames/AC-INS-01-then-1.png)

**Кроки:** ✔ Дано: картку client6 створено, і статус перевірки страхування ще ніхто не позначав → ✔ Коли: scheduler1 відкриває картку client6 → ✔ Тоді: в картці показано «Insurance: Not set»

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1.png у картці «UAT client6 (ins01)» видно рядок «Insurance: Not set», а в шапці праворуч від навігації — «scheduler1@example.test». Обидві видимі частини «Тоді» збігаються з критерієм посимвольно. Email картки на кадрі синтетичний (uat-…@example.test), що відповідає примітці з розділу «Не з кадрів», і я його не оцінював.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Not set» — є на сторінці
- «scheduler1@example.test» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-status-плануваль-20853--бачить-«Insurance-Not-set»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-status-плануваль-20853--бачить-«Insurance-Not-set»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-01 — …») · @login: ____

## AC-INS-02 — PASS

**Тест:** AC-INS-02: scheduler1 позначає «Verified» — бачить «Insurance status saved.», картка показує «Insurance: Verified» і після повторного відкриття

**Критерій** (requirements/33-planuvalnyk-status-perevirky-strakhuvannia.md):

> AC-INS-02: Дано картка client6 показує «Insurance: Not set». Коли scheduler1 позначає статус перевірки страхування «Verified». Тоді scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову.

![Кадр «Тоді» 1](frames/AC-INS-02-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-02-then-2.png)

**Кроки:** ✔ Дано: картка client6 показує «Insurance: Not set» → ✔ Коли: scheduler1 позначає статус перевірки страхування «Verified» → ✔ Тоді: scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified» → ✔ Коли: scheduler1 відкриває картку client6 знову → ✔ Тоді: картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову

**Агент (claude-haiku-5-5, PASS):** На кадрі 1 видно повідомлення «Insurance status saved.», рядок «Insurance: Verified» і вибране «Verified» у полі «Insurance status». На кадрі 2 (сторінка картки, за описом journey відкрита знову) рядок «Insurance: Verified» також є. В обох кадрах у шапці scheduler1@example.test. Частини про базу та повторне відкриття без повідомлення не з кадрів, тому не оцінені.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance status saved.» — є на сторінці
- «Insurance: Verified» — є на сторінці
- «Insurance status» — є на сторінці
- «Verified» — є на сторінці
- «scheduler1@example.test» — є на сторінці
- «Insurance: Verified» — є на сторінці
- «scheduler1@example.test» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-status-плануваль-3cc22--після-повторного-відкриття-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-status-плануваль-3cc22--після-повторного-відкриття-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-02 — …») · @login: ____

## AC-INS-03 — PASS

**Тест:** AC-INS-03: admin1 змінює статус на «Private pay» — і admin1, і scheduler2 бачать «Insurance: Private pay»

**Критерій** (requirements/33-planuvalnyk-status-perevirky-strakhuvannia.md):

> AC-INS-03: Дано картка client7 показує «Insurance: Verified». Коли admin1 змінює статус перевірки страхування на «Private pay», а потім scheduler2 відкриває картку client7. Тоді і admin1, і scheduler2 бачать у картці «Insurance: Private pay».

![Кадр «Тоді» 1](frames/AC-INS-03-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-03-then-2.png)

**Кроки:** ✔ Дано: картка client7 показує «Insurance: Verified» → ✔ Коли: admin1 змінює статус перевірки страхування на «Private pay» → ✔ Коли: а потім scheduler2 відкриває картку client7 → ✔ Тоді: і admin1, і scheduler2 бачать у картці «Insurance: Private pay» → ✔ Тоді: і admin1, і scheduler2 бачать у картці «Insurance: Private pay»

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1.png картка показує «Insurance: Private pay», у шапці «admin1@example.test», і є напис «Insurance status saved.». На кадрі frame-then-2.png та сама картка показує «Insurance: Private pay», у шапці «scheduler2@example.test». Заголовок картки на кадрах «UAT client7 (ins03)» з синтетичним email — це згадано в ac.md як очікуване й не оцінюється.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Private pay» — є на сторінці
- «admin1@example.test» — є на сторінці
- «Insurance: Private pay» — є на сторінці
- «scheduler2@example.test» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-status-адміністр-a8df7-ать-«Insurance-Private-pay»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-status-адміністр-a8df7-ать-«Insurance-Private-pay»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-03 — …») · @login: ____

## AC-INS-04 — PASS

**Тест:** AC-INS-04: therapist1 відкриває картку свого клієнта — бачить «Insurance: Not accepted», змінити статус не запропоновано

**Критерій** (requirements/33-planuvalnyk-status-perevirky-strakhuvannia.md):

> AC-INS-04: Дано client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted». Коли therapist1 відкриває картку client6. Тоді він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано.

![Кадр «Тоді» 1](frames/AC-INS-04-then-1.png)

**Кроки:** ✔ Дано: client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted» → ✔ Коли: therapist1 відкриває картку client6 → ✔ Тоді: він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано

**Агент (claude-sonnet-5-5, PASS):** На кадрі картка «UAT client6 (ins04)» показує «Insurance: Not accepted», у шапці therapist1@example.test. Списку «Insurance status» і кнопки «Save insurance status» у картці немає, є лише поля Client type, Date of birth, Session language, Email.

Haiku сказав NEEDS-HUMAN, тож розбір повторив Sonnet; рішення агента — за Sonnet.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Not accepted» — є на сторінці
- «Client type» — є на сторінці
- «Date of birth» — є на сторінці
- «Session language» — є на сторінці
- «Email» — є на сторінці
- «therapist1@example.test» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-status-терапевт--8b885-ити-статус-не-запропоновано-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-status-терапевт--8b885-ити-статус-не-запропоновано-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-04 — …») · @login: ____

## AC-INS-05 — PASS

**Тест:** AC-INS-05: therapist1 напряму (Supabase REST) пробує змінити статус на «Verified» — статус не змінився, scheduler1 бачить «Insurance: Not accepted»

**Критерій** (requirements/33-planuvalnyk-status-perevirky-strakhuvannia.md):

> AC-INS-05: Дано client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted». Коли therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified». Тоді статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted».

![Кадр «Тоді» 1](frames/AC-INS-05-then-1.png)

**Кроки:** ✔ Дано: client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted» → ✔ Коли: therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified» → ✔ Коли: scheduler1 відкриває картку client6 → ✔ Тоді: статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted»

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1.png сторінка «Client card» з картки «UAT client6 (ins05)» показує рядок «Insurance: Not accepted», а в шапці — «scheduler1@example.test». Обидві видимі частини «Тоді» збігаються з критерієм посимвольно. Частини про PATCH і базу даних не з кадрів, тож їх не оцінював.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Not accepted» — є на сторінці
- «scheduler1@example.test» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-status-терапевт--db25d-ть-«Insurance-Not-accepted»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-status-терапевт--db25d-ть-«Insurance-Not-accepted»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-05 — …») · @login: ____

## AC-INS-06 — PASS

**Тест:** AC-INS-06: без входу за прямим посиланням на картку — лише сторінка входу, scheduler1 після цього бачить «Insurance: Verified»

**Критерій** (requirements/33-planuvalnyk-status-perevirky-strakhuvannia.md):

> AC-INS-06: Дано користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified». Коли він відкриває картку client6 за прямим посиланням. Тоді він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано, а scheduler1 після цього бачить у картці client6 «Insurance: Verified».

![Кадр «Тоді» 1](frames/AC-INS-06-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-06-then-2.png)

**Кроки:** ✔ Дано: користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified» → ✔ Коли: він відкриває картку client6 за прямим посиланням → ✔ Тоді: він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано → ✔ Коли: scheduler1 після цього відкриває картку client6 → ✔ Тоді: scheduler1 після цього бачить у картці client6 «Insurance: Verified»

**Агент (claude-sonnet-5-5, PASS):** Кадр 1 — лише форма входу (Вхід, Email, Пароль, кнопка Увійти), без рядка Insurance і даних клієнта. Кадр 2 — картка UAT client6 з «Insurance: Verified» і scheduler1@example.test у шапці.

Haiku сказав NEEDS-HUMAN, тож розбір повторив Sonnet; рішення агента — за Sonnet.

**Цитати агента, звірені зі сторінкою (aria):**
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Вхід» — є на сторінці
- «Email» — є на сторінці
- «Пароль» — є на сторінці
- «Увійти» — є на сторінці
- «Insurance: Verified» — є на сторінці
- «scheduler1@example.test» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-status-без-входу-dcea2-бачить-«Insurance-Verified»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-status-без-входу-dcea2-бачить-«Insurance-Verified»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-06 — …») · @login: ____

## AC-INTAKE-03 — PASS

**Тест:** AC-INTAKE-03: чернетку Client Ten заповнено у формі, scheduler1 не створює картку — у списку клієнтів її немає

**Критерій** (requirements/36-planuvalnyk-chernetka-kartky-kliienta.md):

> AC-INTAKE-03: Дано чернетку за текстом з AC-INTAKE-01 заповнено у формі нової картки. Коли scheduler1 не створює картку й відкриває список клієнтів. Тоді картки «Client Ten» у списку немає: картку створює лише сам планувальник, коли зберігає форму.

![Кадр «Тоді» 1](frames/AC-INTAKE-03-then-1.png)

**Кроки:** ✔ Дано: чернетку за текстом з AC-INTAKE-01 заповнено у формі нової картки → ✔ Коли: scheduler1 не створює картку й відкриває список клієнтів → ✔ Тоді: картки «Client Ten» у списку немає: картку створює лише сам планувальник, коли зберігає форму

**Агент (claude-haiku-5-5, PASS):** На кадрі сторінка Clients під користувачем scheduler1@example.test. У полі пошуку введено «Client Ten», і під ним написано «No clients found.», тож картки з таким ім'ям у результатах немає. Email цього прогону на кадрі не видно, тому перевірка «з email цього прогону» спирається лише на порожній результат пошуку; пошук за email і підрахунок карток — поза межами кадрів.

**Цитати агента, звірені зі сторінкою (aria):**
- «Clients» — є на сторінці
- «Client cards» — є на сторінці
- «scheduler1@example.test» — є на сторінці
- «No clients found.» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-intake-draft-планув-b4dc7--у-списку-клієнтів-її-немає-chromium/video.webm` · **траса:** `test-results/artifacts/client-intake-draft-планув-b4dc7--у-списку-клієнтів-її-немає-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INTAKE-03 — …») · @login: ____

## AC-INTAKE-06 — PASS

**Тест:** AC-INTAKE-06: текст не є зверненням нового клієнта — поля форми не змінено (Name лишається «Client Fifteen»)

**Критерій** (requirements/36-planuvalnyk-chernetka-kartky-kliienta.md):

> AC-INTAKE-06: Дано у формі нової картки вже введено Name «Client Fifteen». Коли scheduler1 просить скласти чернетку з тексту звернення «Can you recommend a good book about anxiety?». Тоді поля форми не змінено (Name лишається «Client Fifteen»), і scheduler1 бачить повідомлення «This text can't be used to draft a client card. Paste the client's request or fill in the form manually.»

![Кадр «Тоді» 1](frames/AC-INTAKE-06-then-1.png)

**Кроки:** ✔ Дано: у формі нової картки вже введено Name «Client Fifteen» → ✔ Коли: scheduler1 просить скласти чернетку з тексту звернення «Can you recommend a good book about anxiety?» → ✔ Тоді: поля форми не змінено (Name лишається «Client Fifteen»), і scheduler1 бачить повідомлення «This text can't be used to draft a client card. Paste the client's request or fill in the form manually.»

**Агент (claude-haiku-5-5, PASS):** На кадрі сторінки «New client card» під полем запиту видно інформаційне повідомлення з текстом критерію, а в полі Name стоїть «Client Fifteen». Апострофи в «can't» і «client's» на кадрі виглядають як прямі, але з такою роздільністю тип апострофа (прямий чи типографський) не можна визначити з упевненістю; посимвольну відповідність вважаю збіжною. Частини про порожні поля та нествореність картки з кадрів не оцінюю.

**Цитати агента, звірені зі сторінкою (aria):**
- «This text can't be used to draft a client card. Paste the client's request or fill in the form manually.» — є на сторінці
- «Client Fifteen» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-intake-draft-планув-3462f-лишається-«Client-Fifteen»--chromium/video.webm` · **траса:** `test-results/artifacts/client-intake-draft-планув-3462f-лишається-«Client-Fifteen»--chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INTAKE-06 — …») · @login: ____

## Як читати підсумок

- **PASS** — автоматичні перевірки пройшли, агент-рецензент погодився з кадром, а кожну його цитату знайдено на сторінці.
- **FAIL** — впала автоматична перевірка. Агент цього не перекриває: невидимі вади (буфер обміну, база) він на кадрі не побачить.
- **NEEDS-HUMAN** — перевірки зелені, але агент не погодився або його цитати немає на сторінці. Часто це слабкий тест або розбіжність між текстом AC і тестом — питання до PM, а не обов'язково вада продукту.

Правила: R1: перевірка впала — FAIL завжди, агент не перекриває; R2: немає вердикту агента або кадру; R3: перевірки пройшли, агент не погоджується — вирішує людина; R4: цитати агента немає на сторінці (aria) — не підтверджено; R5: помилка сторінки або 5xx під час сценарію; R6: перевірки, агент і цитати збігаються.
