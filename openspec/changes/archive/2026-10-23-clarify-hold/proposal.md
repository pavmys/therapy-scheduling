# Proposal

## Why

PM оновила вимогу Sofiia-pm/therapy-scheduling-spec#2 2026-10-22 (знімок `requirements/2-planuvalnyk-utrymuie-slot-terapevta.md` від 2026-10-23, PR pavmys/therapy-scheduling#11) після питань розробників і порівняння реалізацій: додала AC-HOLD-37…41, уточнила AC-HOLD-05 і AC-HOLD-06, правило коректного email та імені клієнта. Ця зміна переносить ці уточнення в нашу специфікацію з тими самими ID.

Рядки «Журналу змін» PM, на які відповідає зміна:

- AC-HOLD-37 — питання https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/14 (наше Q2);
- AC-HOLD-38 — питання https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/15 (наше Q3);
- «Припущення» й «Поза межами»: усі користувачі зрізу 1 — сид — питання https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/13 (наше Q1);
- правило коректного email й AC-HOLD-39 — власне рішення PM і питання https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/16;
- AC-HOLD-40 — питання https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/17;
- AC-HOLD-41 і припущення про ім'я — питання https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/18;
- AC-HOLD-05, AC-HOLD-06: «будь-хто» → «планувальник» — власне рішення PM.

## What Changes

- **MODIFIED** AC-HOLD-05, AC-HOLD-06 (`slot-holds`): у кроці «Коли» — «планувальник переглядає слот» замість «будь-хто переглядає слот»; поведінка та сама.
- **MODIFIED** вимога «Перевірка імені та email клієнта» (`client-cards`, AC-HOLD-11, AC-HOLD-15 без змін тексту): правило коректного email з «Припущень» PM (рівно один «@», непорожні частини, крапка після «@», без пробілів усередині) і ім'я лише з пробілів як порожнє; **ADDED** сценарій AC-HOLD-39.
- **ADDED** AC-HOLD-41 (`client-cards`): ім'я зберігається без пробілів по краях.
- **ADDED** AC-HOLD-37 (`slot-holds`): повторне утримання простроченого слоту за тим самим клієнтом прибирає старий «Expired» зі списку утримань.
- **ADDED** AC-HOLD-38 (`slot-holds`): список утримань — лише «Held» і «Expired» за часом слоту від найближчого, без сеансів.
- **ADDED** AC-HOLD-40 (`therapist-schedule`): терапевт бачить у розкладі лише ім'я клієнта, без email і без списку клієнтів.
- Прибраних AC немає.

## Capabilities

### New Capabilities

- (немає)

### Modified Capabilities

- `client-cards`: правило коректного email та імені клієнта (AC-HOLD-39, AC-HOLD-41).
- `slot-holds`: повторне утримання після прострочення й вміст списку утримань (AC-HOLD-37, AC-HOLD-38); уточнення AC-HOLD-05, AC-HOLD-06.
- `therapist-schedule`: що терапевт бачить про клієнта (AC-HOLD-40).

## Users & roles

Без змін щодо `add-hold`: планувальник і адміністратор створюють клієнтів, утримують і підтверджують; терапевт бачить лише власний розклад і в ньому — лише ім'я клієнта (AC-HOLD-40). Усі користувачі зрізу 1 (admin1, scheduler1, scheduler2, therapist1, therapist2) — сид; створення користувачів і зміна ролей у застосунку — поза межами (Sofiia-pm/therapy-scheduling-spec#13).

## Non-goals

- Створення користувачів і зміна ролей у застосунку — правило про ролі в матриці прав «Продукту».
- Список і картки своїх клієнтів для терапевта — WS7.
- Решта «Поза межами» — як у `add-hold`.

## Assumptions

Нові й змінені припущення PM:

- Усі користувачі зрізу 1 — admin1, scheduler1, scheduler2, therapist1, therapist2 (*@example.test) — та доступність терапевтів готуються як початкові дані (сид).
- Коректний email (після прибирання пробілів на початку й у кінці) містить рівно один «@», непорожні частини до й після нього, крапку в частині після «@» і не має пробілів усередині.
- Ім'я клієнта зберігається без пробілів на початку й у кінці; ім'я лише з пробілів вважається порожнім.

Власні припущення (розробник): без змін щодо `add-hold` (пошук клієнта за частиною імені або email). Припущення «(розробник) користувачі зрізу 1 — сид» тепер — припущення PM.

## Open questions

- Q1 — https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/13: закрито рішенням PM (сид), внесено в «Припущення» й «Поза межами».
- Q2 — https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/14: закрито рішенням PM, AC-HOLD-37.
- Q3 — https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/15: закрито рішенням PM, AC-HOLD-38.
- Відкриті питання PM з `add-hold` (утримання довше початку слоту, одне активне утримання на клієнта, підтвердження з WS8) — без змін, не в цьому зрізі.
