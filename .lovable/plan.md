## Tavoite

Luodaan suomenkielinen, kuvakaappauksilla varustettu peruskäyttöohje normaalille käyttäjälle (ei admin/esimies-osioita). Ohje näkyy sovelluksen sisällä omana sivuna, johon pääsee sivupalkin valikosta. Kuvakaappaukset otetaan automatisoidusti previewistä demo-käyttäjällä.

## Mitä sivu sisältää

Sivu rakentuu neljästä laajennettavasta osiosta (Accordion), jokaisessa numeroidut askeleet ja niihin liittyvät kuvakaappaukset:

1. **Kirjautuminen ja PWA-asennus**
   - Sisäänkirjautuminen sähköpostilla ja salasanalla
   - "Unohtuiko salasana?" -toiminto
   - Sovelluksen asentaminen kotinäytölle (Android/iOS-erot lyhyesti)
   - Kielen vaihto ja teema (vaalea/tumma)

2. **Työajan kirjaus**
   - Aloita työ / Lopeta työ -painikkeet etusivulta
   - "Sairaana tänään" -toiminto
   - Lounaan automaattinen vähennys lyhyesti
   - Mitä tapahtuu offline-tilassa

3. **Omat tunnit ja muokkaus**
   - Omat kirjaukset -näkymä
   - "Pending"-tilassa olevan kirjauksen muokkaus ja poisto
   - Lukittuminen hyväksynnän jälkeen
   - Omien tilastojen katselu

4. **Lomat, matkakulut ja muistutukset**
   - Lomahakemuksen lähettäminen (erilliset alkamis-/päättymispäivät)
   - Matkakulujen lisäys (km, pysäköinti, asiakas, kuittikuva)
   - Henkilökohtaisten muistutusten asettaminen Asetuksissa
   - Push-ilmoitusten salliminen selaimessa

Sivun yläosaan tulee lyhyt esittelyteksti ja sisällysluettelo. Jokaisen osion yläpuolella on iso otsikko, alapuolella askeleet numeroituna ja niihin liittyvät kuvakaappaukset selitteineen. Sivu noudattaa olemassa olevaa industrial-modern -tyyliä (Space Grotesk / Inter, semantic tokens index.css:stä).

## Tekniset muutokset

- **Uusi sivu** `src/pages/UserGuide.tsx` — yksi React-komponentti, jossa käytetään olemassa olevia shadcn-komponentteja (`Accordion`, `Card`, `Separator`).
- **Uusi reitti** `/ohje` lisätään `src/App.tsx`:ään suojatuksi reitiksi (`ProtectedRoute`).
- **Sivupalkin valikko**: lisätään uusi rivi `src/components/dashboard/Dashboard.tsx` -komponentin valikkoluetteloon (esim. ikoni `BookOpen`, label `t('menu.userGuide')`).
- **i18n**: lisätään käännösavaimet `src/lib/i18n.tsx`:ään (`menu.userGuide`, `guide.title`, `guide.section.*` jne.). EN-puolelle lisätään tyngät, FI-puoli täytetään kokonaan.
- **Kuvakaappaukset**:
  - Otetaan browser-työkalulla seuraavilta sivuilta demo-käyttäjällä:
    - `/login` (lomake + salasanan unohtuminen)
    - `/` (etusivu, Aloita/Lopeta-painikkeet, tilakortti)
    - `/my-entries` (omat kirjaukset, muokkausnappi)
    - `/my-statistics` (tilastonäkymä)
    - `/vacation-requests` (lomahakemuslomake)
    - `/travel-expenses` (matkakulujen lisäys)
    - `/settings` (muistutukset ja kieli)
  - Tallennetaan polkuun `src/assets/guide/` (esim. `01-login.png`, `02-dashboard-clockin.png`…).
  - Importataan `UserGuide.tsx`:ään ES-importeilla, jotta Vite optimoi ne.
  - Mobiiliviewport (390×844) jotta kuvat vastaavat puhelinkokemusta.

## Mitä EI tehdä

- Ei kosketa olemassa olevaan `docs/Käyttöohje.md` -tiedostoon (jää ylläpitäjille tekniseksi viiteohjeeksi).
- Ei admin- tai esimieskuvauksia.
- Ei muutoksia auth-, tietokanta- tai backend-koodiin.

## Lopputulos

Käyttäjä näkee sivupalkissa uuden "Käyttöohje"-rivin, klikkaa sitä ja saa selkeän, kuvitetun perehdytyksen sovelluksen tärkeimpiin toimintoihin omalla äidinkielellään.
