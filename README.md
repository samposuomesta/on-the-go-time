# TimeTrack – Työajanseuranta

Moderni työajanseurantasovellus yrityksille. Sisältää kellokorttikirjaukset, poissaolojen hallinnan, loma-anomukset, projektituntien seurannan, matkakulut ja admin-raportit.

## Ominaisuudet

- ⏱ Työajan kirjaus (sisään/ulos) GPS-paikannuksella
- 📅 Loma- ja poissaolopyynnöt hyväksymiskiertoineen
- 📊 Projektituntien seuranta
- 🚗 Matkakulujen kirjaus (km-korvaus, pysäköinti)
- 📈 Admin-raportit ja CSV/PDF-vienti
- 🔔 Push-ilmoitukset ja muistutukset
- 📱 PWA – toimii myös mobiilissa offline-tilassa
- 🌐 Kaksikielinen (suomi / englanti)

## Teknologiat

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (self-hosted tai pilvi) – tietokanta, autentikointi, Edge Functions
- **PWA:** Service Worker, offline-tuki

## Käyttöohje

Loppukäyttäjän suomenkielinen käyttöohje: **[docs/Käyttöohje.md](docs/Käyttöohje.md)**

## Asennus (on-premise)

Katso yksityiskohtaiset asennusohjeet: **[docs/Installation101.md](docs/Installation101.md)**

## Kehitysympäristö

```sh
# Kloonaa repo
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Asenna riippuvuudet
npm install

# Käynnistä kehityspalvelin
npm run dev
```

## Lisenssi

Yksityinen – kaikki oikeudet pidätetään.
