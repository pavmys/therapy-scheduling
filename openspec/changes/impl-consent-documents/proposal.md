# Proposal

## Why

Реалізуємо зріз 5 «Планувальник формує документи згоди клієнта, позначає їх підписаними, і лише тоді утримання стає підтвердженим сеансом» — специфікацію з `openspec/specs/consent-documents` (переклад вимоги HryhoriiHaponiukQuitCode/therapy-scheduling-spec#34, зміни `add-consent-documents` і `align-consent-documents`) і змінену вимогу підтвердження в `openspec/specs/slot-holds`.

## What Changes

Зміна покриває всі 11 AC зрізу:

- `consent-documents`: AC-DOC-01, AC-DOC-02, AC-DOC-03, AC-DOC-04, AC-DOC-05, AC-DOC-06, AC-DOC-07, AC-DOC-08, AC-DOC-09, AC-DOC-10, AC-DOC-11
- `slot-holds` (вимога «Підтвердження утримання як сеансу»): AC-HOLD-12, AC-HOLD-23, AC-HOLD-27 і пов'язані AC-HOLD-13, -14, -19, -22, -36 мають лишитися зеленими (регресія)
