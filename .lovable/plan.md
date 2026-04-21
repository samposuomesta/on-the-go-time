

# goal-buddy-checkin — kaikki sivut, komponentit ja palvelinpuoli

[Lähdeprojekti: Viikkotavoitteet](/projects/62bb9bcb-0bb5-4c71-8692-d4aaf767ee36)

## Sivut (`src/pages/`)

| Tiedosto | Mitä tekee | Tuodaanko? |
|---|---|---|
| `Index.tsx` | Käyttäjän pääsivu: nykyiset tavoitteet, syöttö, arviointi, historia, tiimi-välilehti | ✅ → uusi `src/pages/WeeklyGoals.tsx` |
| `Admin.tsx` | Hallintapaneeli välilehdillä (käyttäjät, tiimit, pohjat, yhteenveto, vienti) | ✅ → upotetaan `AdminDashboard.tsx`-sivuun uutena osiona |
| `Auth.tsx` | Kirjautumissivu | ❌ — integral-timetrackissä on jo oma |
| `ResetPassword.tsx` | Salasanan resetointi | ❌ — on jo |
| `NotFound.tsx` | 404 | ❌ — on jo |

## Komponentit (`src/components/`)

### Käyttäjäpuoli (juuri)
| Tiedosto | Mitä tekee | Tuodaanko? |
|---|---|---|
| `GoalInput.tsx` | Lomake oman viikkotavoitteen syöttöön (kategoria + teksti) | ✅ → `src/components/weekly-goals/GoalInput.tsx` |
| `CurrentGoals.tsx` | Listaa kuluvan viikon omat tavoitteet | ✅ |
| `RatingModal.tsx` | Modaali arviointia varten (1–4 + kommentti) | ✅ |
| `WeeklyHistory.tsx` | Aiempien viikkojen lista + pisteet | ✅ |
| `TeamDashboard.tsx` | Tiimin jäsenten tavoitteet ja arviot | ✅ |
| `Header.tsx` | Yläpalkki | ❌ — integral-timetrackissä on oma layout |
| `NavLink.tsx` | Reititys-link | ❌ — on jo |
| `ProtectedRoute.tsx` | Auth-suojaus | ❌ — on jo `AuthContext` |
| `UserProfileModal.tsx` | Profiilin muokkaus | ❌ — on jo `Settings`-sivu |
| `ui/*` | shadcn-komponentit | ❌ — kaikki jo olemassa |

### Hallintapuoli (`src/components/admin/`)
| Tiedosto | Mitä tekee | Tuodaanko? |
|---|---|---|
| `TeamManagement.tsx` | Luo/muokkaa tiimejä, hallitse jäseniä | ✅ → `src/components/admin/weekly-goals/TeamManagement.tsx` |
| `GoalTemplateManagement.tsx` | Tavoitepohjat + niiden ajoitus tuleville viikoille | ✅ |
| `TeamSummaryView.tsx` | Tiimien viikoittaiset tulokset | ✅ |
| `UserSummaryView.tsx` | Käyttäjäkohtaiset yhteenvedot | ✅ |
| `DataExport.tsx` | CSV-vienti | ✅ (sovitetaan `src/lib/csv-export.ts`-konventioon) |
| `UserManagement.tsx` | Käyttäjähallinta (luo/poista) | ❌ — integral-timetrackissä on jo oma `EmployeesPanel` |

## Hookit ja tyypit

| Tiedosto | Tuodaanko? |
|---|---|
| `src/hooks/useGoals.ts` | ✅ → `src/hooks/useWeeklyGoals.ts` (auth.uid → users.id -kytkentä päivitetään) |
| `src/types/goals.ts` | ✅ → `src/types/weekly-goals.ts` (kategoriat, ratingit, rajapinnat) |
| `src/contexts/AuthContext.tsx` | ❌ — käytetään integral-timetrackin omaa |
| `src/hooks/use-mobile.tsx`, `use-toast.ts` | ❌ — on jo |

## Edge-funktiot (`supabase/functions/`)

| Funktio | Tuodaanko? |
|---|---|
| `admin-create-user`, `admin-delete-user`, `bootstrap-admin` | ❌ — `create-auth-user` / `delete-auth-user` hoitavat jo |
| `slack-reminders`, `slack-test-message` | ❌ — käytetään olemassa olevaa Web Push -reitistöä (`process-reminders`) |
| `main` | tarkastetaan; käytännössä toiminnallisuus siirretään olemassa olevaan `process-reminders`-funktioon `weekly_goal`-tyyppinä |

## Tietokanta (`supabase/migrations/`)

8 olemassa olevaa migraatiota — niitä **ei kopioida sellaisenaan**, vaan luodaan **yksi yhdistelmämigraatio** integral-timetrackiin:
- Taulut: `teams`, `user_teams`, `goal_templates`, `weekly_goals`, `goals`, `scheduled_goals`
- Kytketään `users(id)` ja `companies(id)` integral-timetrackin tauluihin (ei `profiles`-taulua)
- RLS company-eristyksellä `is_same_company_user()` -funktion kautta
- `user_reminders.day_of_week` lisäyksenä (perjantai 15:00 oletus)

## Yhteenveto: mikä lähtee mukaan

**Kopioidaan ja sovitetaan integral-tyyliin (yhteensä ~13 tiedostoa):**
- 1 sivu (`WeeklyGoals.tsx`)
- 5 käyttäjäkomponenttia (GoalInput, CurrentGoals, RatingModal, WeeklyHistory, TeamDashboard)
- 5 admin-komponenttia (TeamManagement, GoalTemplateManagement, TeamSummaryView, UserSummaryView, DataExport)
- 1 hook (`useWeeklyGoals.ts`)
- 1 tyyppimäärittely (`weekly-goals.ts`)

**Pudotetaan kokonaan:**
- Auth-sivut, profiili, käyttäjähallinta, ProtectedRoute, AuthContext, Header (jo olemassa)
- Slack-funktiot (käytetään Web Push)
- admin/user-create/delete -funktiot (jo olemassa)
- `profiles`/`user_roles`-trigger ja goal-buddyn migraatiot

**Lisätään integraatiopisteet (5 muokattavaa tiedostoa):**
- `src/App.tsx` — reitti `/weekly-goals`
- `src/components/dashboard/Dashboard.tsx` — valikon ensimmäinen kohta
- `src/pages/Settings.tsx` — viikonpäivä + kellonaika -muistutusasetus
- `src/pages/AdminDashboard.tsx` — uusi "Viikkotavoitteet"-osio Projektihallinnan yläpuolelle
- `src/lib/i18n.tsx` + `supabase/functions/process-reminders/index.ts` + `src/lib/version.ts`

Kaikki menee samaan repoon, samaan Supabase-instanssiin, sama auth, sama push, sama deployment. Vahvista vielä avoimet kysymykset (tiimit-rakenne, näkyvyys, Slack pois) niin siirrytään toteutukseen.

