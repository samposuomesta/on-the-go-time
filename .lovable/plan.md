## Tavoite

Toteutetaan vain vaiheet 1 ja 2 alkuperäisestä suunnitelmasta. Varmistetaan että:
- Kirjautuminen toimii edelleen (Login, Forgot Password, Reset Password)
- Kaikki nykyiset 69 `supabase.from(...)` -kutsua jatkavat toimintaansa
- Yhdenkään käyttäjän työaika-, poissaolo-, kulu- tai muut merkinnät eivät katoa eivätkä muutu

Vaiheet 3–6 jätetään myöhempään.

## Tarkistus: kirjautumisflow on turvallinen vaiheelle 1

Kävin läpi `Login.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` ja `AuthContext.tsx`:

| Komponentti | Käyttääkö public-tauluja anon-roolilla? | Status |
|---|---|---|
| `Login.tsx` | Ei. Ainoa taulukutsu (`users`, `login_sessions`) tapahtuu vasta `signInWithPassword()`-kutsun JÄLKEEN — silloin client on jo authenticated. | OK |
| `ForgotPassword.tsx` | Ei. Vain `supabase.auth.resetPasswordForEmail()`. | OK |
| `ResetPassword.tsx` | Ei. Vain `supabase.auth.updateUser()` ja `getSession()`. | OK |
| `AuthContext.tsx` | Lukee `users` vasta kun `authUser` on olemassa. | OK |

**Johtopäätös:** anon-roolin USAGE-oikeuden poisto `public`-skeemasta ei riko kirjautumista. `auth`-skeema säilyy koskemattomana, joten `signInWithPassword`, `resetPasswordForEmail` ja `updateUser` toimivat.

## Tarkistus: kaikkien merkintöjen säilyminen

Kaikki 69 `supabase.from(...)` -kutsua tapahtuvat sisäänkirjautumisen jälkeen, eli **authenticated**-roolilla. Vaihe 1 ei kosketa authenticated-roolin oikeuksia eikä yhtään RLS-policyä.

**Data on fyysisesti koskematonta:**
- Vaihe 1 muuttaa vain `GRANT`-oikeuksia (anon → ei pääse `public`-skeemaan). Ei `DROP`, ei `ALTER TABLE`, ei `DELETE`.
- Vaihe 2 on puhtaasti UI-kerros — ei vaikuta tietokantaan lainkaan.

Yhdenkään rivin sisältö, status, omistaja tai approval-tila ei muutu. Edge-funktiot (`data-api`, `process-reminders`, `create-auth-user`) käyttävät `service_role`-avainta — eivät vaikutu.

## Vaihe 1: anon-roolin pääsy public-skeemaan

### Toimenpide

Migraatio:

```sql
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Varmista että authenticated säilyttää oikeutensa (RLS hoitaa rivitason)
GRANT USAGE ON SCHEMA public TO authenticated;
```

### Mitä tämä EI riko

- `auth.users`, `auth.sessions` ovat `auth`-skeemassa → kirjautuminen ehjä
- Edge-funktiot käyttävät service_role → ehjä
- Authenticated-käyttäjien kaikki kyselyt → ehjä
- RLS-policyt → ei muuteta

### Testattava toteutuksen jälkeen

1. Inkognito-selain → Login-sivu latautuu, mutta `GET /rest/v1/` palauttaa 401
2. Sisäänkirjautuminen admin-tunnuksilla onnistuu
3. `login_sessions`-rivi syntyy GPS:n kanssa
4. Dashboard: time_entries, absences, vacation_requests latautuvat
5. Admin-paneeli: käyttäjälista, hyväksynnät, raportit toimivat
6. Reset password -linkki toimii ulos kirjautuneena
7. Edge-funktiot vastaavat normaalisti
8. Curl-todistus: `curl https://domain/rest/v1/ -H "apikey: <ANON_KEY>"` ei enää listaa tauluja

### Rollback

Yksi migraatio palauttaa:

```sql
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
```

(RLS suojaa silti — anon ei pääsisi mihinkään riviin koska policyt vaativat `auth_user_id()`-kontekstin.)

## Vaihe 2: virheviestien sanitointi (frontin interceptor)

Valitsin frontin interceptorin tietokantatriggerien sijaan: kevyempi, ei migraatioita, ei vaikuta dataan.

### Toimenpide

Uusi tiedosto `src/lib/safe-error.ts`:

```ts
const GENERIC = 'Operation failed';

const LEAKY_PATTERNS = [
  /relation ".+" does not exist/i,
  /column ".+" of relation/i,
  /violates (unique|foreign key|check) constraint ".+"/i,
  /duplicate key value violates/i,
  /permission denied for (table|relation|schema) /i,
  /new row violates row-level security/i,
];

export function sanitizeError(err: unknown): Error {
  const msg = (err as any)?.message || String(err);
  const code = (err as any)?.code;

  // Säilytä auth-virheet (jo Supabase-asiakkaan suodattamia)
  if (code?.startsWith?.('auth/') || msg.includes('Invalid login credentials')) {
    return new Error(msg);
  }

  if (LEAKY_PATTERNS.some((p) => p.test(msg))) {
    return new Error(GENERIC);
  }
  return new Error(msg);
}
```

Opt-in käyttö paikoissa joissa virhe näytetään UI:ssa:
- `src/hooks/useAdminData.ts`
- `src/hooks/useTimeTracking.ts`
- `src/components/dashboard/Add*Dialog.tsx`, `src/components/entries/Edit*Dialog.tsx`
- `src/pages/LongSickLeave.tsx`, `src/pages/VacationRequests.tsx`

Korvataan `toast.error(error.message)` → `toast.error(sanitizeError(error).message)` ja sanitoidaan myös `console.error`-kutsut samoissa kohdissa.

### Mitä tämä EI vaikuta

- DevTools Network näyttää edelleen raa'an vastauksen (käyttäjäkohtaista — kynnys nousee koska muut käyttäjät eivät näe constraintien nimiä toasteissa)
- Ei tietokantakutsuja → yhtään merkintää ei voi kadota

## Yhteenveto: data on turvassa

| Riski | Vaihe 1 | Vaihe 2 |
|---|---|---|
| Tietokannan rakenteen muutos | Ei | Ei |
| RLS-policyjen muutos | Ei | Ei |
| Datan poisto/muutos | Ei | Ei |
| Authenticated-käyttäjien pääsyn muutos | Ei | Ei |
| Anon-roolin pääsy `auth`-skeemaan (kirjautuminen) | Ei | Ei |
| Edge-funktioiden toiminta | Ei | Ei |

## Toteutusjärjestys

1. **Vaihe 2 ensin** (matalin riski): `safe-error.ts` + ~10 callsite-päivitystä
2. **Vaihe 1**: Migraatio test-ympäristössä → 8 testikohtaa → tuotantoon
3. Päivitä `mem://auth/security-architecture`

### Työmääräarvio
- Vaihe 2: ~2 h
- Vaihe 1: ~1 h migraatio + 30 min validointi
- Yhteensä: noin puoli päivää
