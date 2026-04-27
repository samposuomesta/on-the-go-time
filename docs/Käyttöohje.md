# TimeTrack – Käyttöohje

Tämä ohje kuvaa TimeTrack-sovelluksen käytön työntekijälle, esimiehelle ja
ylläpitäjälle (admin). Sovellus toimii selaimessa ja PWA-sovelluksena puhelimella.

---

## Sisällys

1. [Kirjautuminen ja kieli](#1-kirjautuminen-ja-kieli)
2. [Etusivu (Dashboard)](#2-etusivu-dashboard)
3. [Työajan kirjaus](#3-työajan-kirjaus)
4. [Projektitunnit](#4-projektitunnit)
5. [Matkakulut](#5-matkakulut)
6. [Lomat ja poissaolot](#6-lomat-ja-poissaolot)
7. [Pitkä sairasloma](#7-pitkä-sairasloma)
8. [Viikkotavoitteet](#8-viikkotavoitteet)
9. [Omat kirjaukset ja tilastot](#9-omat-kirjaukset-ja-tilastot)
10. [Asetukset ja muistutukset](#10-asetukset-ja-muistutukset)
11. [Esimiehen toiminnot](#11-esimiehen-toiminnot)
12. [Ylläpitäjän (admin) toiminnot](#12-ylläpitäjän-admin-toiminnot)
13. [PWA – asennus puhelimeen ja offline-käyttö](#13-pwa--asennus-puhelimeen-ja-offline-käyttö)
14. [Usein kysytyt kysymykset](#14-usein-kysytyt-kysymykset)

---

## 1. Kirjautuminen ja kieli

- Avaa sovellus selaimella ja kirjaudu sähköpostilla ja salasanalla.
- Salasanan unohtuessa käytä **Unohtuiko salasana?** -linkkiä – saat
  palautuslinkin sähköpostiisi.
- Kieli (suomi / englanti) vaihtuu yläpalkista. Suomi on oletus. Päivämäärät
  näytetään muodossa `pv.kk.vvvv` ja desimaalit pilkulla.
- Kirjautuessa sovellus tallentaa kirjautumisajan ja (luvalla) GPS-koordinaatit
  istuntotietoihin. Paikkatietoa käytetään ainoastaan kirjautumisen ja
  uloskirjautumisen yhteydessä – sovellus **ei** seuraa sijaintia taustalla.

---

## 2. Etusivu (Dashboard)

Etusivu on mobiilikäyttöön optimoitu. Sieltä löytyy:

- **Kellokello** – nykyinen aika ja päivämäärä.
- **Tilakortti** – nykyinen tila (kirjautunut sisään / ulos / sairaana / lomalla)
  ja kuluvan istunnon kesto.
- **Pikatoiminnot** – nappulat työajan aloittamiseen ja lopettamiseen,
  projektituntien lisäykseen, matkakulujen kirjaamiseen ja "Sairaana tänään"
  -merkintään.
- **Vasen sivupalkki** – navigointi sovelluksen muille sivuille (Omat
  kirjaukset, Lomat, Matkakulut, Tilastot, Viikkotavoitteet, Asetukset, Admin).

---

## 3. Työajan kirjaus

### Sisään- ja uloskirjaus

1. Paina **Aloita työ** etusivun pikatoiminnoista.
2. Sovellus tallentaa aloitusajan ja GPS-sijainnin (jos lupa annettu).
3. Kun työpäivä päättyy, paina **Lopeta työ**.

Vinkkejä:

- Voit aloittaa ja lopettaa työaikaa useita kertoja päivässä – jokainen
  kirjaus tallentuu omana istuntonaan, eivätkä ne saa mennä päällekkäin.
- **Keskiyön yli menevät istunnot:** kaikki tunnit kohdistuvat aloituspäivään
  työaikapankin ja raporttien laskentaa varten.
- Jos sovellus on offline-tilassa, kirjaukset tallentuvat selaimen muistiin ja
  synkronoituvat automaattisesti, kun verkkoyhteys palaa.

### Lounaan automaattinen vähennys

Jos ylläpitäjä on määrittänyt **automaattisen lounasvähennyksen**, lounas
(oletuksena 30 min) vähennetään automaattisesti, jos työpäivä ylittää määritetyn
kynnyksen (oletuksena 5 h).

### Vanhojen kirjausten muokkaus

- Voit muokata tai poistaa **vain pyynnössä** ("pending") olevia omia
  kirjauksia sivulla **Omat kirjaukset**.
- Heti kun esimies tai admin on hyväksynyt tai hylännyt kirjauksen, se on
  lukittu – pyydä silloin tarvittaessa esimiestä tekemään korjaus.
- Jos esimies tai admin muokkaa historiakirjausta, hänen on kirjattava
  pakollinen **vapaa muutoksen syy** (audit-jälki).

---

## 4. Projektitunnit

Projektit ovat ylläpitäjän määrittelemiä työ- tai asiakaskohteita, joihin tunteja
kohdistetaan.

1. Etusivulta: **Lisää projektituntia** → valitse projekti, päivämäärä,
   tuntimäärä ja vapaaehtoinen kuvaus.
2. Tunnit menevät hyväksyttäväksi (`pending`).
3. Voit selata ja muokata omia projektitunteja sivulla **Omat kirjaukset**
   välilehdellä **Projektitunnit** – muokkaus on mahdollista vain ennen
   hyväksyntää tai hylkäystä.

Jokaiselle projektille voi olla asetettu **tavoitetuntimäärä**, jonka edistymistä
seurataan admin-raporteissa.

---

## 5. Matkakulut

Matkakulu sisältää kilometrit, mahdolliset pysäköintikulut, päivärahat ja
kuittikuvan.

1. Etusivulta: **Lisää matkakulu** tai erillinen sivu **Matkakulut**.
2. Täytä:
   - **Päivämäärä, otsikko, asiakas / kohde, reitti, kuvaus**
   - **Ajoneuvotyyppi:** auto, peräkärry, etuauto, työsuhdeauto tai ei mitään
   - **Kilometrit** ja **pysäköintikulut**
   - **Päiväraha:** ei / osittainen / täysi
   - **Matkan alku ja loppu** (kellonaika)
   - **Projekti** (vapaaehtoinen)
   - **Kuittikuva** – voit ottaa kuvan suoraan puhelimen kameralla; kuva
     tallentuu yksityiseen tallennuskoriin
3. Korvaussummat lasketaan yrityksen määrittelemillä km- ja päivärahataksoilla.
4. Lähetä hyväksyttäväksi – muokkaaminen on mahdollista vain ennen päätöstä.

---

## 6. Lomat ja poissaolot

### Loma-anomus

1. Sivu **Lomapyynnöt** → **Uusi lomapyyntö**.
2. Valitse **alku-** ja **loppupäivä** erillisistä päivämääräpoiminnoista
   (sovellus ei käytä yhdistettyjä range-komponentteja).
3. Lisää valinnainen kommentti.
4. Pyyntö menee esimiehelle / adminille hyväksyttäväksi.
5. Saat ilmoituksen, kun pyyntö on **hyväksytty** tai **hylätty** (push +
   valinnaisesti Slack).

### Sairauspoissaolo ja muut poissaolot

- **Sairaana tänään** -nappi etusivulta: merkitsee sinut sairaaksi tästä
  päivästä alkaen ja lopettaa mahdollisen aktiivisen työaikaistunnon
  automaattisesti.
- Muut poissaolot lisätään **Poissaolosyy**-valikon kautta. Yritys voi
  määritellä omia syitä (esim. "Lapsen sairaus", "Koulutus") sekä englanniksi
  että suomeksi.

---

## 7. Pitkä sairasloma

Sivu **Pitkä sairasloma** on tarkoitettu monen päivän sairauspoissaoloille,
joista usein tarvitaan lääkärintodistus. Anna alku- ja loppupäivä sekä syy.
Pyyntö käsitellään samalla tavalla kuin tavallinen poissaolo.

---

## 8. Viikkotavoitteet

Viikkotavoitteet auttavat sinua suunnittelemaan viikon tärkeimmät asiat ja
arvioimaan onnistumisen jälkikäteen.

1. Avaa sivu **Viikkotavoitteet**.
2. **Aseta tavoitteet** -näkymässä lisää 1–6 tavoitetta valitsemalla kategoria
   (asiakkaat & myynti, johtaminen, HR, tuotanto, osaaminen, muu) ja
   kirjoittamalla tavoitteen teksti.
3. Voit käyttää **valmiita pohjia**, jos admin on luonut yritykselle
   tavoitepohjia.
4. Viikon lopussa avautuu **Arviointi** – arvioi kukin tavoite tähdillä (1–5)
   ja lisää valinnainen kommentti.
5. **Historia** näyttää aiempien viikkojen tavoitteet ja arvioinnit.
6. Esimiehet näkevät tiimin tavoitteet välilehdellä **Tiimi**.

Admin voi lisäksi **ajastaa** valmiin pohjan automaattisesti tietyn viikon
tavoitteeksi yhdelle tai usealle työntekijälle.

---

## 9. Omat kirjaukset ja tilastot

### Omat kirjaukset

Sivu **Omat kirjaukset** kokoaa kaikki omat:

- työaikaistunnot
- projektitunnit
- matkakulut
- poissaolot ja lomat

Kustakin näkyy tila (`pending`, `approved`, `rejected`). Pending-rivejä voit
muokata tai poistaa.

### Omat tilastot

Sivu **Omat tilastot** näyttää:

- Tehdyt tunnit valitulla aikavälillä
- **Työaikapankki** – kumulatiivinen saldo sopimuksen alkupäivästä tai
  viimeisestä manuaalisesta nollauksesta. Pankki huomioi yrityksen lomat
  ja Suomen arkipyhät.
- Projektien jakauma ja matkakulujen yhteenveto

---

## 10. Asetukset ja muistutukset

Sivu **Asetukset**:

- **Profiili** – etunimi, sukunimi, henkilönumero, puhelin, aikavyöhyke
- **Salasanan vaihto**
- **Kieli ja teema** (vaalea / tumma / järjestelmä) – valinta säilyy
- **Push-ilmoitukset** – salli selaimelle ilmoitusten lähettäminen
- **Slack-integraatio** – syötä oma Slack-käyttäjä-ID, jos haluat saada
  muistutukset myös Slackiin (admin asettaa yrityksen Slack-tokenin)

### Henkilökohtaiset muistutukset

Voit määritellä **henkilökohtaiset muistutukset**:

- **Sisäänkirjauksen muistutus** – kellonaika, jolloin haluat muistutuksen
  jos et ole vielä kirjautunut sisään.
- **Uloskirjauksen muistutus** – kellonaika, jolloin haluat muistutuksen
  jos sinulla on yhä avoin istunto.
- **Viikkotavoitteen muistutus** – viikonpäivä + kellonaika, jolloin
  muistetaan asettaa / arvioida viikon tavoitteet.
- **Lomastatus-muistutus** – ilmoitus, kun lomapyyntösi hyväksytään tai
  hylätään.

Esimiehille on lisäksi **avoimet lomapyynnöt** -muistutus.

**Tärkeää:**

- Muistutuksia ei lähetetä **viikonloppuisin** (la/su) eikä **Suomen
  arkipyhinä** (clock_in/out, viikkotavoite).
- Muistutuksia ei lähetetä päivinä, jolloin olet **lomalla, sairaana tai
  muuten poissa**.
- **Lomapyynnön hyväksynnän/hylkäyksen ilmoitus** lähetetään aina
  pyydettyyn aikaan myös viikonloppuna.

---

## 11. Esimiehen toiminnot

Esimies näkee niiden työntekijöiden tiedot, joiden esimieheksi hänet on
merkitty (yksi työntekijä voi kuulua usealle esimiehelle).

- **Hyväksynnät:** sivu **Admin** → **Hyväksynnät** näyttää odottavat
  työaikaistunnot, projektitunnit, matkakulut ja lomapyynnöt. Hyväksyntä
  vihreällä, hylkäys punaisella.
- **Lomapyynnöt:** sivu **Lomapyyntöjen hyväksynnät** sisältää erillisen
  hyväksyntänäkymän esimiehille.
- **Tiimin viikkotavoitteet:** näe tiimin asettamat ja arvioimat tavoitteet.
- Historiakirjauksen muokkaaminen edellyttää aina kirjallisen syyn.

---

## 12. Ylläpitäjän (admin) toiminnot

Admin näkee koko yrityksen tiedot. **Admin-paneeli** sisältää välilehdet:

- **Hyväksynnät** – kaikkien työntekijöiden hyväksyntäjono.
- **Käyttäjähallinta** – luo ja muokkaa työntekijöitä:
  - Etu- ja sukunimi, henkilönumero, sähköposti
  - Rooli (employee / manager / admin)
  - Sopimuksen alkupäivä, vuosittaiset lomapäivät, päivittäinen työaika
  - Lounaskynnys ja automaattinen lounasvähennys
  - Esimies(t) (monta–moneen)
  - Tiimit
- **Projektit** – luo ja hallinnoi projekteja, aseta tavoitetunnit ja asiakas.
- **Tiimit** – luo tiimejä ja liitä työntekijät.
- **Lomakalenteri (Vacation Timeline)** – Gantt-kaavio kaikkien lomista,
  hyväksynnät rivillä.
- **Poissaolosyyt** – hallinnoi yrityksen omia poissaolosyitä (FI/EN).
- **Muistutussäännöt** – yrityksen muistutusmallit (clock_in, clock_out,
  vacation_pending, weekly_goal, vacation_status), ajastus ja Slack-kanava.
- **Viikkotavoitepohjat** – luo pohjia ja **ajasta** ne tietylle viikolle ja
  käyttäjille.
- **Raportit** – yhdistetty näkymä kirjautumisistunnoista ja
  työaikaistunnoista, suodatettavissa käyttäjän, päivämäärävälin, projektin
  ja statuksen mukaan. Esikatselu 200 riviä, vienti CSV:ksi (sarakesuodatus
  käytössä).
- **Tuonti (Import)** – työntekijöiden joukkotuonti CSV- tai Fennoa-XLSX-
  tiedostosta. Saraketulkinta sarakkeista A, B, C, K, P; oletukseksi 8 h
  työpäivä ja 30 min lounas.
- **API-avaimet** – luo X-API-Key -avaimia ulkoiselle integraatiolle. Avaimet
  tukevat lukuoperaatioita (`/v1/time-entries`, `/v1/project-hours`,
  `/v1/travel-expenses`, `/v1/vacation-requests`, `/v1/absences`),
  kursoripohjaista sivutusta ja `Idempotency-Key`-otsikkoa (7 päivää).
  Vastaus sisältää `user_id`-kentän jälkeen `user_email`-kentän.

### Yrityksen asetukset

- Yrityksen nimi, Y-tunnus, osoite, maa (Suomi → arkipyhälaskenta)
- Aikavyöhyke (oletus Europe/Helsinki)
- Km-taksat (auto, peräkärry, etuauto), päivärahat (osittainen, täysi)
- Slack: Bot Token ja oletuskanava

### Tietoturva

- Pääsy on rajoitettu rooleilla ja **Row-Level Security** -säännöillä.
- Yritystenvälinen tieto on tiukasti eristettyä.
- Henkilökohtaisia GPS-koordinaatteja ei sisälly CSV/PDF-vientiin.
- Audit-loki tallentaa kaikki kriittiset muutokset (muutoksen syy,
  tekijä, aikavyöhyke).

---

## 13. PWA – asennus puhelimeen ja offline-käyttö

TimeTrack on **Progressive Web App** – voit asentaa sen puhelimeen kuin
sovelluksen.

**iPhone (Safari):**
1. Avaa sovelluksen osoite Safarissa.
2. Paina **Jaa**-nappia → **Lisää aloitusnäyttöön**.

**Android (Chrome):**
1. Avaa osoite Chromessa.
2. Valikosta → **Asenna sovellus** / **Lisää aloitusnäyttöön**.

**Offline-tila:**

- Työajan aloitus, lopetus ja muut kirjaukset toimivat ilman verkkoa.
- Tiedot tallentuvat selaimen IndexedDB-tietokantaan.
- Synkronointi tapahtuu automaattisesti, kun yhteys palaa.

**Päivitykset:**

- Sovellus ilmoittaa, kun uusi versio on saatavilla – paina **Päivitä**.
- Versionumero näkyy asetuksissa, esim. `26.3.44`.

---

## 14. Usein kysytyt kysymykset

**En saa kirjattua sisään – nappi on harmaa.**
Tarkista onko sinulla jo avoin istunto. Lopeta ensin edellinen istunto.

**Push-ilmoitukset eivät tule.**
Tarkista (1) että annoit selaimelle ilmoituslupia, (2) että muistutus on
päällä asetuksissa, (3) että nykyinen päivä ei ole loma, sairas tai
arkipyhä, (4) että et ole estänyt sovellusta puhelimen järjestelmästä.

**Voinko muokata viikon takaista työaikakirjausta?**
Vain jos se on yhä `pending`. Hyväksytty / hylätty kirjaus on lukittu –
pyydä esimiestä korjaamaan se ja kirjaamaan muutoksen syy.

**Miksi keskiyön yli menneet tunnit näkyvät vain aloituspäivällä?**
Sovellus kohdistaa koko istunnon aloituspäivälle työaikapankin laskennan
yksinkertaistamiseksi.

**Miten saan Slack-ilmoitukset?**
Pyydä admin asettamaan yrityksen Slack Bot Token ja oletuskanava. Lisää
sen jälkeen oma Slack-käyttäjä-ID asetuksiin ja kytke "Lähetä Slackiin"
päälle muistutuksiisi.

**Miten käytän ulkoista API:a?**
Admin luo sinulle API-avaimen Admin-paneelista. Käytä sitä `X-API-Key`
-otsikossa. Listaussivut tukevat kursoripohjaista sivutusta ja
`Idempotency-Key`-otsikkoa (voimassa 7 päivää). Esimerkki:

```
GET /functions/v1/data-api/v1/time-entries?limit=100
X-API-Key: <oma-avain>
```

Vastaus sisältää käyttäjän sähköpostin (`user_email`) heti `user_id`:n
jälkeen.
