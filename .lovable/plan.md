

## Korjataan preview: puuttuva paketti

**Ongelma**
`src/components/ui/dialog.tsx` käyttää importia:
```
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
```
Pakettia `@radix-ui/react-visually-hidden` ei kuitenkaan ole projektin riippuvuuksissa. Vite-dev-server kaatuu virheeseen *"Failed to resolve import"*, joten preview-ikkuna jää tyhjäksi. Sama syy aiheutti palvelimella `npm ci`-virheen (`lock file's @radix-ui/react-visually-hidden@1.2.3 does not satisfy 1.2.4`).

**Korjaus**
1. Lisätään `@radix-ui/react-visually-hidden` (versio `^1.2.4`, joka vastaa muiden Radix-pakettien tasoa) projektin `package.json`-riippuvuuksiin. Lovable päivittää lockfilen automaattisesti, jolloin Vite löytää importin ja preview palautuu toimintaan.

**Kun preview toimii ja muutos on julkaistu GitHubiin**, aja palvelimella tavalliseen tapaan:
```bash
# Run from: /opt/timetrack/
sudo bash /opt/timetrack/app/scripts/update.sh
```
Aiemmin lisäämäsi `npm ci → npm install` -varareitti `update.sh`-skriptissä takaa, että lockfile-eron sattuessa build menee silti läpi.

**Tekniset yksityiskohdat**
- Tiedosto: `package.json` — lisätään rivi `"@radix-ui/react-visually-hidden": "^1.2.4"` muiden `@radix-ui/*` pakettien joukkoon.
- Ei muutoksia `dialog.tsx`-tiedostoon — import on oikein, vain riippuvuus puuttuu.
- Dev-serverin Vite-cache nollautuu uudelleenkäännöksen yhteydessä automaattisesti.

