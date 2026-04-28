import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  LogIn,
  Play,
  Square,
  Thermometer,
  FileText,
  CalendarDays,
  Receipt,
  Bell,
  Smartphone,
  Camera,
  Edit3,
  Trash2,
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  WifiOff,
  Lock,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * Käyttöohje-sivu (suomeksi).
 * Sisältää kuvitetut "mock-UI" -esimerkit, jotka päivittyvät automaattisesti
 * design-tokenien (index.css) mukana, eivätkä vanhene kuvakaappausten tapaan.
 */
export default function UserGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="touch-target flex items-center justify-center rounded-lg p-2 hover:bg-muted"
            aria-label="Takaisin"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold">Käyttöohje</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Intro */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Tervetuloa TimeTrackiin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Tämä ohje auttaa sinut alkuun sovelluksen käytössä. Käy läpi osiot
              omassa tahdissasi — voit palata tähän milloin vain sivupalkin
              valikosta.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
              <TocChip icon={LogIn} label="1. Kirjautuminen" />
              <TocChip icon={Play} label="2. Työaika" />
              <TocChip icon={FileText} label="3. Omat tunnit" />
              <TocChip icon={CalendarDays} label="4. Lomat & kulut" />
            </div>
          </CardContent>
        </Card>

        <Accordion type="multiple" defaultValue={['s1']} className="space-y-3">
          {/* OSIO 1 */}
          <AccordionItem value="s1" className="rounded-lg border border-border bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle icon={LogIn} number="1" title="Kirjautuminen ja sovelluksen asennus" />
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <Step number={1} title="Avaa sovellus selaimella">
                Pyydä ylläpitäjältä sovelluksen osoite ja kirjautumistunnukset.
                Avaa osoite puhelimen tai tietokoneen selaimella.
              </Step>

              <MockLogin />

              <Step number={2} title="Syötä sähköposti ja salasana">
                Kirjoita sähköpostiosoitteesi ja salasanasi, ja paina{' '}
                <strong>Kirjaudu sisään</strong>.
              </Step>

              <Step number={3} title="Unohtuiko salasana?">
                Klikkaa <strong>Unohtuiko salasana?</strong> -linkkiä. Saat
                sähköpostiisi palautuslinkin, jonka kautta voit asettaa uuden
                salasanan.
              </Step>

              <Step number={4} title="Salli sijainti pyydettäessä">
                Selain saattaa kysyä lupaa sijaintitietoihin. Salli, jotta
                työajan kirjaukseen tallentuu paikkatieto. Sovellus käyttää
                sijaintia <strong>vain</strong> kirjautumis- ja
                uloskirjautumishetkellä — ei taustalla.
              </Step>

              <Separator />

              <Step number={5} title="Asenna sovellus puhelimen kotinäytölle" icon={Smartphone}>
                Sovellus toimii kuin natiivisovellus, kun lisäät sen
                kotinäytölle:
                <ul className="ml-5 mt-2 list-disc space-y-1">
                  <li>
                    <strong>Android (Chrome):</strong> Napauta valikkoa (⋮) →{' '}
                    <em>Lisää aloitusnäytölle</em>.
                  </li>
                  <li>
                    <strong>iPhone (Safari):</strong> Napauta jako-kuvaketta (□↑)
                    → <em>Lisää Koti-valikkoon</em>.
                  </li>
                </ul>
              </Step>

              <Step number={6} title="Vaihda kieli ja teema" icon={Globe}>
                Sivupalkin <strong>Asetukset</strong>-sivulta voit vaihtaa
                kielen (suomi / englanti) ja teeman (vaalea / tumma /
                järjestelmä).
                <div className="mt-3 flex gap-2">
                  <Pill icon={Globe}>Suomi</Pill>
                  <Pill icon={Sun}>Vaalea</Pill>
                  <Pill icon={Moon}>Tumma</Pill>
                </div>
              </Step>
            </AccordionContent>
          </AccordionItem>

          {/* OSIO 2 */}
          <AccordionItem value="s2" className="rounded-lg border border-border bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle icon={Play} number="2" title="Työajan kirjaus" />
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <Step number={1} title="Aloita työ">
                Avaa etusivu ja paina vihreää <strong>Aloita työ</strong>{' '}
                -painiketta. Sovellus tallentaa aloitusajan ja sijainnin.
              </Step>

              <MockClockButtons state="idle" />

              <Step number={2} title="Seuraa kuluvaa aikaa">
                Tilakortti näyttää kellon käynnissä — voit lukita puhelimen
                rauhassa, kirjaus jatkuu taustalla.
              </Step>

              <MockStatusCard />

              <Step number={3} title="Lopeta työ">
                Päivän päätteeksi paina punaista <strong>Lopeta työ</strong>{' '}
                -painiketta. Kirjaus tallentuu omaan listaasi.
              </Step>

              <MockClockButtons state="working" />

              <Separator />

              <Step number={4} title="Sairaana tänään?" icon={Thermometer}>
                Paina <strong>Sairaana tänään</strong> -painiketta, jos sairastut
                kesken päivän. Mahdollinen käynnissä oleva työaika päätetään
                automaattisesti.
              </Step>

              <Step number={5} title="Lounaan automaattinen vähennys" icon={Clock}>
                Jos ylläpitäjä on määrittänyt automaattisen lounasvähennyksen
                (oletus 30 min, kun työpäivä ylittää 5 h), se vähennetään
                lopullisista tunneista — sinun ei tarvitse tehdä mitään.
              </Step>

              <Step number={6} title="Offline-tila" icon={WifiOff}>
                Jos verkkoyhteys katkeaa, voit silti aloittaa ja lopettaa
                kirjauksen. Tiedot tallentuvat puhelimen muistiin ja
                synkronoituvat automaattisesti, kun yhteys palaa.
              </Step>

              <InfoBox>
                <strong>Vinkki:</strong> Keskiyön yli menevät kirjaukset
                kohdistetaan kokonaisuudessaan aloituspäivään.
              </InfoBox>
            </AccordionContent>
          </AccordionItem>

          {/* OSIO 3 */}
          <AccordionItem value="s3" className="rounded-lg border border-border bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle icon={FileText} number="3" title="Omat tunnit ja muokkaus" />
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <Step number={1} title="Avaa Omat kirjaukset">
                Avaa sivupalkin valikko (☰) ja valitse{' '}
                <strong>Omat kirjaukset</strong>. Näet listan päivistäsi
                tilan kanssa.
              </Step>

              <MockEntriesList />

              <Step number={2} title="Tilojen merkitykset">
                <div className="mt-2 space-y-2">
                  <StatusRow color="bg-yellow-500" label="Odottaa">
                    Esimies ei ole vielä käsitellyt — voit muokata.
                  </StatusRow>
                  <StatusRow color="bg-green-500" label="Hyväksytty">
                    Lukittu, ei voi muokata.
                  </StatusRow>
                  <StatusRow color="bg-red-500" label="Hylätty">
                    Lukittu. Ota yhteyttä esimieheen tarvittaessa.
                  </StatusRow>
                </div>
              </Step>

              <Step number={3} title="Muokkaa tai poista" icon={Edit3}>
                <strong>Vain odottavia</strong> kirjauksia voi muokata.
                Napauta riviä → valitse <strong>Muokkaa</strong> tai{' '}
                <strong>Poista</strong>. Historiamuokkauksiin tarvitaan
                vapaa-tekstinen syy auditointia varten.
              </Step>

              <InfoBox variant="warning" icon={Lock}>
                Kun esimies hyväksyy tai hylkää kirjauksen, se lukkiutuu
                pysyvästi.
              </InfoBox>

              <Separator />

              <Step number={4} title="Katso omat tilastot">
                <strong>Omat tilastot</strong> -sivulta näet työtuntien
                yhteenvedon, työaikapankin saldon ja viikoittaiset
                kertymät.
              </Step>
            </AccordionContent>
          </AccordionItem>

          {/* OSIO 4 */}
          <AccordionItem value="s4" className="rounded-lg border border-border bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle icon={CalendarDays} number="4" title="Lomat, matkakulut ja muistutukset" />
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              {/* Lomat */}
              <h3 className="font-display text-base font-semibold">Lomahakemus</h3>

              <Step number={1} title="Avaa Lomapyynnöt">
                Valikosta → <strong>Lomapyynnöt</strong>.
              </Step>

              <Step number={2} title="Valitse alkamis- ja päättymispäivät">
                Käytä erillisiä päivämääräkenttiä <em>Mistä</em> ja{' '}
                <em>Mihin</em>. Lisää tarvittaessa selite ja lähetä hakemus
                esimiehen hyväksyttäväksi.
              </Step>

              <MockDateRange />

              <Separator />

              {/* Matkakulut */}
              <h3 className="font-display text-base font-semibold">Matkakulut</h3>

              <Step number={1} title="Lisää uusi kulu" icon={Receipt}>
                Valikosta → <strong>Matkakulut</strong> →{' '}
                <strong>Lisää matkakulu</strong>.
              </Step>

              <Step number={2} title="Täytä tiedot">
                <ul className="ml-5 mt-2 list-disc space-y-1">
                  <li>Päivämäärä</li>
                  <li>Ajetut kilometrit</li>
                  <li>Pysäköintimaksut (€)</li>
                  <li>Asiakas (vapaa teksti)</li>
                </ul>
              </Step>

              <Step number={3} title="Liitä kuitti puhelimen kameralla" icon={Camera}>
                Paina <strong>Kuvaa kuitti</strong> — kuva tallentuu
                turvallisesti ja näkyy vain sinulle ja esimiehelle.
              </Step>

              <Separator />

              {/* Muistutukset */}
              <h3 className="font-display text-base font-semibold">Henkilökohtaiset muistutukset</h3>

              <Step number={1} title="Avaa Asetukset" icon={Bell}>
                Valikosta → <strong>Asetukset</strong> → osio{' '}
                <em>Muistutukset</em>.
              </Step>

              <Step number={2} title="Aseta haluamasi ajat">
                Voit pyytää muistutuksia esim. työpäivän aloitukseen ja
                lopetukseen sekä lomahakemusten tilamuutoksista.
              </Step>

              <Step number={3} title="Salli ilmoitukset selaimessa">
                Selain kysyy lupaa push-ilmoituksiin — paina{' '}
                <strong>Salli</strong>. Ilmoitukset toimivat myös, kun
                sovellus on suljettuna.
              </Step>

              <InfoBox>
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                Valmis! Olet käynyt läpi peruskäytön. Jos sinulla on
                kysyttävää, ota yhteyttä esimieheesi tai ylläpitäjään.
              </InfoBox>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
}

/* ---------------------- Apukomponentit ---------------------- */

function TocChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  number,
  title,
}: {
  icon: React.ElementType;
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 text-left">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Osio {number}
        </div>
        <div className="font-display text-base font-semibold">{title}</div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  icon: Icon,
  children,
}: {
  number: number;
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {number}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h4 className="font-display text-sm font-semibold">{title}</h4>
        </div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function InfoBox({
  children,
  variant = 'info',
  icon: Icon,
}: {
  children: React.ReactNode;
  variant?: 'info' | 'warning';
  icon?: React.ElementType;
}) {
  const styles =
    variant === 'warning'
      ? 'border-yellow-500/30 bg-yellow-500/10 text-foreground'
      : 'border-primary/30 bg-primary/5 text-foreground';
  return (
    <div className={`rounded-md border p-3 text-sm ${styles}`}>
      {Icon && <Icon className="mr-2 inline h-4 w-4" />}
      {children}
    </div>
  );
}

function StatusRow({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-2.5 text-sm">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <div>
        <div className="font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------- Mock-UI ---------------------- */

function MockLogin() {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mx-auto max-w-xs space-y-3">
        <div className="text-center font-display text-sm font-semibold">TimeTrack</div>
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            sahkoposti@yritys.fi
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            ••••••••
          </div>
          <button
            disabled
            className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            Kirjaudu sisään
          </button>
          <div className="text-center text-xs text-primary underline">Unohtuiko salasana?</div>
        </div>
      </div>
    </div>
  );
}

function MockClockButtons({ state }: { state: 'idle' | 'working' }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-semibold ${
            state === 'idle'
              ? 'bg-green-600 text-white shadow'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Play className="h-4 w-4" />
          Aloita työ
        </button>
        <button
          disabled
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-semibold ${
            state === 'working'
              ? 'bg-red-600 text-white shadow'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Square className="h-4 w-4" />
          Lopeta työ
        </button>
      </div>
    </div>
  );
}

function MockStatusCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tila</div>
          <div className="font-display text-base font-semibold text-green-600">
            Töissä
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Kesto</div>
          <div className="font-mono text-base font-semibold tabular-nums">02:34:18</div>
        </div>
      </div>
    </div>
  );
}

function MockEntriesList() {
  const rows = [
    { date: '28.4.2026', hours: '7,75 h', status: 'odottaa', color: 'bg-yellow-500' },
    { date: '27.4.2026', hours: '8,00 h', status: 'hyväksytty', color: 'bg-green-500' },
    { date: '24.4.2026', hours: '6,50 h', status: 'hyväksytty', color: 'bg-green-500' },
  ];
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2">
      {rows.map((r, i) => (
        <div
          key={r.date}
          className={`flex items-center justify-between px-3 py-2.5 text-sm ${
            i < rows.length - 1 ? 'border-b border-border/50' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${r.color}`} />
            <div>
              <div className="font-medium">{r.date}</div>
              <div className="text-xs text-muted-foreground">{r.status}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums">{r.hours}</span>
            {r.status === 'odottaa' ? (
              <div className="flex gap-1">
                <Edit3 className="h-4 w-4 text-primary" />
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockDateRange() {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mistä
          </label>
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
            1.7.2026
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mihin
          </label>
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
            21.7.2026
          </div>
        </div>
      </div>
      <button
        disabled
        className="mt-3 w-full rounded-md bg-green-600 py-2 text-sm font-semibold text-white"
      >
        Lähetä hakemus
      </button>
    </div>
  );
}
