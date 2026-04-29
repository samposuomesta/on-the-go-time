# Yleiset käyttöehdot ja tietoturvaseloste

**Palvelu:** Integral TimeTrack
**Päivitetty:** 29.4.2026

---

## 1. Johdanto

Tämä asiakirja kuvaa, miten Integral TimeTrack -palvelu (jäljempänä "Palvelu") kerää, käsittelee ja suojaa käyttäjien henkilötietoja sekä mihin tarkoituksiin tietoja käytetään. Palvelu on työajan-, lomien-, poissaolojen- ja matkakulujen seurantaan tarkoitettu PWA-sovellus, joka on suunniteltu työnantajan ja työntekijöiden väliseen käyttöön.

Käyttämällä Palvelua hyväksyt tämän selosteen ehdot.

---

## 2. Rekisterinpitäjä

Rekisterinpitäjänä toimii työnantajayritys, joka on ottanut Palvelun käyttöön omille työntekijöilleen. Palveluntarjoaja toimii henkilötietojen käsittelijänä rekisterinpitäjän lukuun.

---

## 3. Kerättävät tiedot

Palvelu kerää ja käsittelee seuraavia tietoja:

### 3.1 Käyttäjän perustiedot
- Etu- ja sukunimi
- Sähköpostiosoite
- Henkilönumero (personnel number)
- Yritys- ja tiimitiedot
- Käyttäjärooli (työntekijä, esimies, ylläpitäjä)
- Esimies-/alaissuhteet

### 3.2 Työajanseurannan tiedot
- Kirjautumis- ja uloskirjautumisajat
- Työsessioiden alkamis- ja päättymisajat
- Projektikohtaiset työtunnit
- Lounastauot ja niiden vähennykset
- Työaikapankin saldo

### 3.3 Sijaintitiedot (GPS)
- GPS-koordinaatit kerätään **ainoastaan** kirjautumisen ja uloskirjautumisen yhteydessä autentikointitapahtumana
- **Sijaintia ei seurata taustalla** eikä työajan kuluessa
- Sijaintitietoja käytetään ainoastaan kirjautumistapahtuman vahvistamiseen
- Henkilökohtaisia GPS-koordinaatteja ei sisällytetä CSV-/PDF-vientitiedostoihin

### 3.4 Aikavyöhyketieto
- Selaimen aikavyöhyke kirjautumisen ja sessioiden alkamisen yhteydessä

### 3.5 Loma- ja poissaolotiedot
- Lomahakemukset, niiden tila ja ajanjaksot
- Poissaolosyyt (esim. sairausloma)
- Pitkät sairauslomat

### 3.6 Matka- ja kulutiedot
- Ajetut kilometrit
- Pysäköintikulut
- Asiakas-/kohdetiedot (vapaa teksti)
- Kuittikuvat (tallennetaan suojattuun tiedostosäilöön)

### 3.7 Tekniset tiedot
- Selain- ja laitetunnisteet (push-ilmoituksia varten)
- Sovellusversio
- Lokitiedot virhetilanteista

### 3.8 Viikkotavoitteet
- Käyttäjän asettamat viikkotavoitteet ja niiden arvioinnit

---

## 4. Tietojen käyttötarkoitukset

Kerättyjä tietoja käytetään seuraaviin tarkoituksiin:

1. **Työajanseuranta** – työtuntien, taukojen ja työaikapankin saldon laskenta ja raportointi
2. **Palkanlaskennan tuki** – työaikatietojen toimittaminen palkanlaskennalle hyväksyttyjen tuntien perusteella
3. **Loma- ja poissaolohallinta** – lomahakemusten käsittely, hyväksyminen ja seuranta
4. **Matkakulujen korvaus** – kilometrikorvausten ja muiden työmatkakulujen käsittely
5. **Esimiestyö** – esimiesten suorittama työaikojen, lomien ja poissaolojen hyväksyntä
6. **Autentikointi ja tietoturva** – kirjautumistapahtumien vahvistaminen ja epätavallisen toiminnan tunnistaminen GPS- ja aikavyöhyketietojen avulla
7. **Sovelluksen toimivuus** – ilmoitusten lähettäminen (työajan aloitus/lopetus, lomien tilamuutokset)
8. **Lakisääteiset velvoitteet** – työaikalain mukaisten kirjausten säilyttäminen
9. **Raportointi** – yrityksen sisäinen raportointi, vienti CSV- ja PDF-muodoissa

Tietoja **ei käytetä** markkinointiin eikä luovuteta kolmansille osapuolille muutoin kuin lain edellyttämissä tilanteissa.

---

## 5. Tietoturva

### 5.1 Tekniset suojatoimet
- **Tietokantaeristys (RLS):** Jokaisen yrityksen tiedot on eristetty tietokannan tasolla Row Level Security -käytännöin. Käyttäjä näkee vain oman yrityksensä ja oman vaikutusalueensa tiedot.
- **Salaus:** Tiedonsiirto tapahtuu HTTPS-yhteyden yli (TLS). Salasanat säilytetään ainoastaan kryptografisesti hashattuna.
- **Autentikointi:** Käyttäjien hallinnointi tapahtuu turvallisen autentikointijärjestelmän kautta JWT-tunnisteilla.
- **Roolipohjainen pääsynhallinta:** Käyttäjäroolit (admin, manager, employee) tallennetaan erilliseen tauluun ja oikeuksia tarkistetaan SECURITY DEFINER -funktioilla, jotka estävät oikeuksien laajentamisen.
- **Suojattu tiedostosäilö:** Kuittikuvat ja muut liitteet säilytetään yksityisessä bucketissa, johon pääsy on rajattu.
- **HTML-merkkien escapettaminen:** Vientitiedostoissa estetään koodin injektio.
- **Virheilmoitusten suojaus:** Backend-virheilmoitukset on naamioitu, jotteivät ne paljasta järjestelmän sisäistä rakennetta.

### 5.2 Sijaintitietojen erityiskäsittely
- GPS-koordinaatit tallennetaan vain login/logout-tapahtumissa
- Henkilökohtaisia sijaintitietoja ei viedä raporteissa
- Taustasijaintia ei seurata PWA-rajoitusten ja yksityisyydensuojan vuoksi

### 5.3 Monivuokrainen eristäminen
Palvelu palvelee useita yrityksiä samasta järjestelmästä. Yritysten väliset tiedot on eristetty tiukasti `canSeeUser`-funktion ja RLS-käytäntöjen avulla, jolloin yritys ei voi missään tilanteessa nähdä toisen yrityksen tietoja.

### 5.4 Auditointi
- Hyväksyntään lukitut työaikamerkinnät säilyttävät muutoshistorian
- Historiamuutokset edellyttävät pakollista perustelua audit trail -tarkoituksessa
- Kirjautumistapahtumat lokitetaan

### 5.5 Varmuuskopiot
Tietokannasta otetaan säännöllisesti varmuuskopiot, joiden eheys validoidaan automaattisesti.

---

## 6. Tietojen säilyttäminen

- Työaikatietoja säilytetään työaikalain ja kirjanpitolain edellyttämän ajan
- Käyttäjätili poistettavissa ylläpitäjän kautta, jolloin henkilötiedot poistetaan tai anonymisoidaan
- Kuittikuvat säilytetään niin kauan kuin kirjanpitolaki edellyttää

---

## 7. Käyttäjän oikeudet (GDPR)

Käyttäjällä on oikeus:
- Saada tietää, mitä tietoja hänestä on tallennettu
- Pyytää virheellisten tietojen oikaisua
- Pyytää tietojensa poistamista (oikeus tulla unohdetuksi) lain sallimissa rajoissa
- Pyytää tietojensa siirtoa toiseen järjestelmään
- Vastustaa tietojensa käsittelyä lain sallimissa tilanteissa
- Tehdä valitus tietosuojavaltuutetun toimistolle

Pyynnöt tulee osoittaa työnantajalle (rekisterinpitäjälle).

---

## 8. Evästeet ja paikallinen tallennus

Palvelu käyttää:
- **Selaimen paikallista tallennusta (localStorage / IndexedDB)** kielen, teeman ja offline-tilan tietojen säilyttämiseen
- **Service Worker -välimuistia** offline-toiminnallisuuden mahdollistamiseen
- **Push-tilausta** ilmoitusten toimittamiseen (käyttäjän suostumuksella)

---

## 9. Kolmannet osapuolet

Palvelu hyödyntää seuraavia teknisiä komponentteja:
- Tietokanta- ja autentikointialusta (itse-isännöity)
- Push-ilmoituspalvelu (selaimen tarjoama)
- Vapaaehtoinen Slack-integraatio ilmoituksia varten (jos käytössä)

Tietoja ei luovuteta kolmansille osapuolille markkinointitarkoituksiin.

---

## 10. Muutokset selosteeseen

Tätä selostetta voidaan päivittää tarpeen mukaan. Merkittävistä muutoksista tiedotetaan käyttäjiä Palvelun kautta.

---

## 11. Yhteystiedot

Tietosuojaa koskevissa kysymyksissä voi olla yhteydessä työnantajan tietosuojavastaavaan tai järjestelmän ylläpitäjään.
