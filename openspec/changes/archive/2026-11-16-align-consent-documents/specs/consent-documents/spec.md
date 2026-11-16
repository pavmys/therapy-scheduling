## MODIFIED Requirements

### Requirement: Формування документів згоди за типом клієнта
WHEN планувальник або адміністратор формує документи згоди для клієнта, the system SHALL показати в картці один набір документів зі станом «Not signed» у такому порядку: для «Adult» — «Consent to treatment» і «Cancellation policy acknowledgement», для «Child» — ці два і «Release of information»; повторна спроба (зокрема двома планувальниками одночасно) не створює другого набору.

#### Scenario: AC-DOC-02 Документи згоди для дорослого клієнта
- **GIVEN** для client6 (тип «Adult») документів згоди ще немає
- **WHEN** scheduler1 формує документи згоди для client6
- **THEN** в картці client6 показано рівно два документи — «Consent to treatment» і «Cancellation policy acknowledgement», кожен зі станом «Not signed»
- **AND** в картці показано рядок «Missing signatures: Consent to treatment, Cancellation policy acknowledgement»

#### Scenario: AC-DOC-03 Документи згоди для дитини з опікуном
- **GIVEN** для client7 (тип «Child», опікун «Guardian Seven») документів згоди ще немає
- **WHEN** scheduler1 формує документи згоди для client7
- **THEN** в картці client7 показано рівно три документи — «Consent to treatment», «Cancellation policy acknowledgement» і «Release of information», кожен зі станом «Not signed»
