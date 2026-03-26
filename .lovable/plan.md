

# Raportit: Lisää työntekijäsuodatin

## Muutos

Lisätään Raportit-paneeliin uusi Select-pudotusvalikko, jolla voi suodattaa rivit yksittäisen työntekijän mukaan. Oletuksena "Kaikki työntekijät".

## Toteutus

### 1. `src/components/admin/ReportsPanel.tsx`
- Lisätään uusi tila: `const [employeeFilter, setEmployeeFilter] = useState<string>('all')`
- Lisätään suodatinriville (rivi ~324-337, data filter -selectin viereen) uusi Select-komponentti:
  - Arvo `all` = kaikki työntekijät
  - Listataan `employees`-taulukosta kaikki näkyvät työntekijät (nimi + id)
  - Järjestetään aakkosjärjestykseen
- Muokataan `rows`-useMemon sisällä jokainen osio (login, working, project) lisäämällä ehto: `if (employeeFilter !== 'all' && ls.user_id !== employeeFilter) return;`

### 2. `src/lib/i18n.tsx`
- Lisätään käännösavaimet:
  - `reports.filterEmployee` → "Työntekijä" / "Employee"
  - `reports.allEmployees` → "Kaikki työntekijät" / "All employees"

## Vaikutus
- Vain `ReportsPanel.tsx` ja `i18n.tsx` muuttuvat
- CSV/PDF-vienti kunnioittaa suodatinta automaattisesti (perustuu `rows`-dataan)
- Ei tietokantamuutoksia

