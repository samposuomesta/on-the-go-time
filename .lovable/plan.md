## Tavoite

Tuntipankista vähennetään työtunnit **vain Saldovapaa-poissaolojen** ajalta. Muut poissaolot (sairasloma, loma, palkaton vapaa, koulutus jne.) ja hyväksytyt lomat eivät vähennä saldoa.

## Nykyinen toiminta

`src/hooks/useWorkBank.ts` käy kalenteripäivät läpi ja arkipäiviltä vähentää aina `daily_work_hours`, jos tunteja ei ole tehty. Poissaoloja ja lomia ei huomioida lainkaan, eli sairauspäivät ja lomapäivät vähentävät saldoa virheellisesti.

## Muutos

Tiedosto: `src/hooks/useWorkBank.ts`

1. Hae rinnakkain `time_entries`-haun kanssa:
   - `absences`: `start_date`, `end_date`, `reason_id`, `status` (vain käyttäjän omat, baseline-päivän jälkeen)
   - `vacation_requests`: `start_date`, `end_date`, `status`
   - `absence_reasons`: hae yrityksen `id` + `label` löytääkseen "Saldovapaa"-syyn id:n (`label = 'Time Bank free'` tai `label_fi = 'Saldovapaa'`).
2. Rakenna kaksi `Set<string>` (`yyyy-MM-dd`):
   - **neutralizeDays**: päivät, joilta ei vaadita tunteja eikä saldoa vähennetä. Sisältää:
     - kaikki hyväksytyt `vacation_requests`-päivät (`status = 'approved'`)
     - kaikki hyväksytyt `absences`-päivät, joiden `reason_id` ≠ Saldovapaa
   - **timeBankDays**: hyväksytyt `absences`, joiden `reason_id` = Saldovapaa → näiltä päiviltä saldo vähenee `daily_work_hours` verran (lisäksi mahdollisesti tehdyt tunnit lisätään normaalisti).
3. Päivittäisessä silmukassa logiikka muuttuu näin:
   - Jos päivä on `neutralizeDays`-joukossa → `totalBalance += worked` (ei vähennystä).
   - Muuten jos päivä on viikonloppu/pyhä → `totalBalance += worked` (säilyy).
   - Muuten arkipäivä (mukaan lukien `timeBankDays`) → `totalBalance += worked − daily_work_hours`.
   
   Saldovapaa toimii siis kuten "tavallinen työpäivä jolta ei tehty tunteja" → −7,5 h saldoon. Tämä on haluttu käyttäytyminen: Saldovapaa nimenomaan käyttää pankkia.
4. Pending-tilaiset poissaolot ja lomat eivät neutraloi päivää – vasta hyväksyntä. Hylätyt jätetään huomiotta.

## Mitä EI muuteta

- Baseline-laskenta (`contract_start_date` tai viimeisin `adjustment`).
- Lounasvähennys per session.
- Pyhäpäivien ja viikonloppujen logiikka.
- Tietokantaan ei tehdä migraatioita.

## Testattavaa

- Hyväksytty Sairasloma arkena → saldo ei muutu.
- Hyväksytty loma (`vacation_requests`) arkena → saldo ei muutu.
- Hyväksytty Koulutus / Lapsi sairaana / Palkaton vapaa → saldo ei muutu.
- Hyväksytty **Saldovapaa** arkena → saldo −`daily_work_hours`.
- Pending sairaus tai loma → saldo vähenee normaalisti kunnes hyväksytty.
- Pyhä/viikonloppu → ennallaan.
