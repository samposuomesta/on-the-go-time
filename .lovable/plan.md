# Pilviresurssien tehostus – rajattu toteutus

Toteutetaan vain käyttäjän valitsemat kohdat 1 ja 5. Muut aiemman suunnitelman kohdat jätetään tekemättä.

## 1. `process-reminders` cron-aikataulun keventäminen

Nykyinen aikataulu: `* * * * *` (joka minuutti, 24/7) → ~43 200 ajoa/kk.

Uusi aikataulu:
- **ma–pe**: joka 3. minuutti (`*/3 * * * 1-5`)
- **la–su**: joka 60. minuutti (`0 * * * 0,6`)

Yhteensä ~10 700 ajoa/kk → noin **75 % vähemmän** ajokertoja.

**Huomio muistutusten ajoituksesta:** käyttäjä asettaa muistutuksen `HH:MM`-tarkkuudella, mutta funktio vertaa täsmällisesti `time = currentTime`. 3 min raster tarkoittaa että muistutus, jonka käyttäjä on asettanut esim. klo 08:31, **ei laukea koskaan** koska cron osuu vain minuutteihin 00, 03, 06, ...

Ratkaisu: muutetaan `process-reminders/index.ts` käyttämään aikaikkunaa eikä tarkkaa täsmäystä:
- Lasketaan ajan `currentTime` lisäksi 2 minuuttia taaksepäin (esim. nyt = 08:33 → ikkuna 08:31, 08:32, 08:33).
- Muutetaan kaikki `.eq("time", currentTime)` muotoon `.in("time", windowTimes)`.
- Notification_log -dedup estää tuplalähetykset (sama `referenceId` per päivä).

Viikonlopun 60 min raster on käytännössä OK, koska viikonloppuna ohitetaan kaikki työpäivämuistutukset (kohta 1 koodissa) – ainoa la–su:na ajettava on `vacation_pending` (esimiehille), jonka tarkka kellonaika ei ole kriittinen, mutta sama ikkunalogiikka kattaa senkin.

**Tekniset muutokset:**
- `pg_cron` (käyttäjä päivittää itse Studiosta tai SQL:llä, koska self-hosted ympäristössä cron-ajetaan `http://kong:8000`-URL:lla – ei voida tehdä migraatiolla, joka leviäisi muille). Annetaan SQL-snippet käyttöohjeena.
- `supabase/functions/process-reminders/index.ts`: lisätään `windowTimes`-laskenta ja vaihdetaan `eq → in`.
- `docs/Installation101.md`: päivitetään cron-esimerkki uuteen aikatauluun.

## 5. `useServiceWorkerUpdate` – harvempi tarkistus, vain arkisin

Nykyisin: `setInterval(..., 5 * 60_000)` jokaiselle avoimelle välilehdelle.

Uusi: tarkistetaan **120 min välein, vain ma–pe** (la–su tarkistus skipataan kokonaan). Päivitykset rullataan manuaalisesti ja työajan ulkopuolella tarkistuksilla ei ole arvoa.

**Toteutus** `src/hooks/useServiceWorkerUpdate.ts`:ssa:
- Vaihdetaan väli `120 * 60_000`:een.
- Wrapataan `reg.update()`-kutsu päivätarkistuksella: `const day = new Date().getDay(); if (day === 0 || day === 6) return;`
- Säilytetään olemassa oleva `controllerchange`- ja `updatefound`-logiikka ennallaan, jotta käyttäjä saa silti päivitysilmoituksen heti kun uusi service worker on asennettu (esim. sivulatauksen yhteydessä).

## Mitä EI muuteta

- Ei muuteta TanStack Query -konfiguraatiota, hookkien rakennetta, admin-paneelin lataus­logiikkaa eikä HeaderClockia.
- Ei kosketa frontendin offline-syncia, push-tilauksia eikä autentikaatiota.

## Tiedostot, joita muokataan

- `supabase/functions/process-reminders/index.ts` – aikaikkuna `time`-vertailuun
- `src/hooks/useServiceWorkerUpdate.ts` – 120 min väli + viikonloppu-skip
- `docs/Installation101.md` – uusi cron-esimerkki ja perustelu

## Käyttäjän toimet asennuksen jälkeen

Self-hosted `pg_cron`-aikataulu on ympäristökohtainen eikä päivity automaattisesti. Ohjeistetaan päivittämään se Supabase Studion SQL-editorissa:

```sql
SELECT cron.unschedule('process-reminders');

SELECT cron.schedule(
  'process-reminders-weekday',
  '*/3 * * * 1-5',
  $$ SELECT net.http_post(
    url := 'http://kong:8000/functions/v1/process-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'process-reminders-weekend',
  '0 * * * 0,6',
  $$ SELECT net.http_post(
    url := 'http://kong:8000/functions/v1/process-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);
```

**Run from:** Supabase Studio → SQL Editor (SSH-tunnelin kautta).
