
Käyttäjä kysyy, päivittyykö tietokantamuutos (uusi `title`-sarake `travel_expenses`-tauluun) automaattisesti, kun hän ajaa `update.sh`-skriptin palvelimella.

Tämä on tutkimuskysymys, ei toteutuspyyntö — mutta vastaus on tärkeä, koska väärä oletus rikkoo tuotannon.

## Vastaus: Ei päivity automaattisesti

`scripts/update.sh` tekee vain neljä asiaa:
1. `git pull` — hakee koodin
2. Synkronoi edge-funktiot Supabase-volyymiin
3. `npm ci && npm run build` — rakentaa frontendin
4. `docker compose restart functions` — käynnistää edge-funktiot uudelleen

**Skripti EI aja `supabase/migrations/`-kansion SQL-tiedostoja.** Eli uusi sarake `travel_expenses.title` ei luodu palvelimen tietokantaan pelkällä `update.sh`-ajolla. Tuloksena: kuittien tallennus epäonnistuu 400-virheellä, koska sarake puuttuu.

## Miten migraatio ajetaan tällä self-hosted-kannalla

Muistin (`mem://tech/deployment/database-migrations`) mukaan migraatiot ajetaan käsin `/opt/timetrack/app/`-hakemistosta portin 5433 kautta (Supavisorin ohi).

Komento (Run from: `/opt/timetrack/app/`):

```bash
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h localhost -p 5433 -U postgres -d postgres \
  -f supabase/migrations/20260417112223_d1cb0095-e6a5-43ff-8132-8eaf0b41b0db.sql
```

Sen jälkeen käynnistä `rest`-kontti, jotta PostgREST huomaa uuden sarakkeen:

```bash
cd /opt/timetrack/supabase-docker/docker && docker compose restart rest
```

## Suositus: lisätään migraatioajo `update.sh`-skriptiin

Jotta tätä ei tarvitse muistaa joka kerta, ehdotan että `update.sh`-skriptiin lisätään uusi vaihe **kohdan 2 ja 3 väliin**, joka:

- Iteroi `supabase/migrations/`-kansion `.sql`-tiedostot aikajärjestyksessä
- Pitää kirjaa ajetuista migraatioista `public.schema_migrations`-taulussa (versio = tiedostonimi)
- Ajaa vain ne tiedostot, joita ei vielä ole taulussa
- Käyttää porttia 5433 (Supavisorin ohi) kuten muistissa määritelty
- Käynnistää `rest`-kontin uudelleen, jos vähintään yksi migraatio ajettiin

Esimerkkilogiikka:

```text
==> [3/5] Applying pending database migrations
    - 20260417112223_*.sql ... applied
    - (others) ... already applied, skipped
==> [4/5] Restarting rest container (schema reloaded)
==> [5/5] Building frontend ...
```

### Toteutusvaiheet (kun hyväksyt suunnitelman)

1. Päivitä `scripts/update.sh`:
   - Lisää uusi step "Apply pending database migrations" kohdan 2 jälkeen
   - Luo `schema_migrations(version text primary key, applied_at timestamptz default now())` -taulu, jos ei vielä ole
   - For-loop joka ajaa puuttuvat migraatiot transaktiossa ja insertoi versionumeron
   - Käynnistä `rest`-kontti vain jos joku migraatio ajettiin
   - Numeroi vaiheet uudelleen ([1/5] … [5/5])
2. Päivitä muistia `mem://tech/deployment/maintenance-workflow` ja `mem://tech/deployment/database-migrations` heijastamaan uutta automaatiota.
3. Käyttäjän toimet palvelimella tällä kertaa (kerran, käsin, koska skripti ei vielä sisällä logiikkaa):
   - Aja yllä oleva `psql -f …` -komento ennen `update.sh`:n ajamista, TAI
   - Aja ensin `git pull` + päivitetty `update.sh`, jolloin uusi automaatio hoitaa migraation.

Migraation jälkeen kuittien lataus alkaa toimia uudella `title`-pakollisella kentällä.
