
Käyttäjä pyytää korjaamaan `applicationServerKey`:n palauttamaan `Uint8Array`:n `ArrayBuffer`:n sijaan, koska se on yleisin iOS push -tilauksen virhelähde.

Nykyinen koodi (`src/hooks/usePushSubscription.ts` rivit 6-15):
```ts
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  ...
  return outputArray.buffer;  // ← palauttaa ArrayBufferin
}
```

iOS Safari (WebKit) on tunnetusti tarkka siitä, että `applicationServerKey` on **`Uint8Array`** eikä `ArrayBuffer`. Vaikka spec hyväksyy molemmat, iOS:n `pushManager.subscribe()` voi epäonnistua hiljaisesti tai luoda viallisen APNs-rekisteröinnin, jos annetaan `ArrayBuffer`.

## Suunnitelma

**1 tiedosto, 1 funktio muutetaan:**

`src/hooks/usePushSubscription.ts`:
- Muuta `urlBase64ToUint8Array` palauttamaan `Uint8Array` (`ArrayBuffer` sijaan)
- Päivitä TypeScript-paluutyyppi
- Pidä loppuosa koodista ennallaan — `applicationServerKey`-muuttuja saa nyt automaattisesti oikean tyypin

**Versionnosto:**

`src/lib/version.ts`: `26.3.16` → `26.3.17`

## Päivityksen jälkeen

```
sudo bash /opt/timetrack/app/scripts/update.sh
```

Sitten iPhonella:
1. Asetukset → "Poista kaikki tilaukset ja tilaa uudelleen"
2. Lähetä testi-ilmoitus
3. Jos APNs-token oli aiemmin viallinen, tämä luo nyt validin
