

## Päivitä vanhentuneet riippuvuudet

Kaikki npm-varoitukset tulevat **transitiivisista riippuvuuksista** (ei suorista). Korjataan päivittämällä yksi suora dev-riippuvuus, jonka päivitys eliminoi suurimman osan varoituksista.

### Diagnoosi

| Varoitus | Lähde |
|---|---|
| `inflight`, `glob@7`, `rimraf@2`, `abab`, `domexception`, `whatwg-encoding`, `fstream` | **`jsdom@20`** (vuodelta 2022, vanhentunut) |
| `lodash.isequal` | `recharts` / `react-hook-form` -ketju (ei meidän hallinnassa) |

`jsdom` on käytössä vain testeissä (`vitest` + `@testing-library/react`). Päivitys `jsdom@20 → jsdom@25` poistaa kaikki yllä olevat varoitukset paitsi `lodash.isequal`.

### Tehtävät muutokset

**`package.json`** – devDependencies:
- `"jsdom": "^20.0.3"` → `"jsdom": "^25.0.1"`

Ei muita muutoksia. Vitestin `environment: "jsdom"` -konfiguraatio toimii sellaisenaan jsdom 25:n kanssa.

### Mitä EI päivitetä ja miksi

- **`lodash.isequal`** – tulee kolmannen osapuolen kirjastoista (`recharts`/`react-hook-form`). Pelkkä varoitus, ei tietoturvariski. Häviää kun nuo kirjastot päivittyvät major-versioon (esim. recharts v3), mikä vaatii oman testaus­kierroksensa eikä liity tähän pyyntöön.
- **`exceljs`** (pulls `fstream`) – käytössä employee-importissa. Uusin `exceljs@4.4` on jo asennettu; `fstream` häviää vasta exceljs:n seuraavassa majorissa (ei vielä julkaistu).

### Verifiointi päivityksen jälkeen

1. `npm install` – varoitusten määrä pienenee 9 → 1 (vain `lodash.isequal` jää)
2. `npm run test` – varmistaa että jsdom 25 toimii olemassa olevien testien kanssa
3. `npm run build` – varmistaa että build menee läpi

### Versiopäivitys

`src/lib/version.ts`: `26.3.42` → `26.3.43`

