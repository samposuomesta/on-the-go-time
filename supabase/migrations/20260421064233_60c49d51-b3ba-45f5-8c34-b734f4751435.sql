-- 1. Companies: lisää aikavyöhyke, osoitekentät, KM-rates ja päivärahat. Säilytetään 'address' ja 'km_rate' taaksepäin yhteensopivuuden vuoksi.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Helsinki',
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS car_km_rate numeric NOT NULL DEFAULT 0.55,
  ADD COLUMN IF NOT EXISTS trailer_km_rate numeric NOT NULL DEFAULT 0.09,
  ADD COLUMN IF NOT EXISTS per_diem_partial numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS per_diem_full numeric NOT NULL DEFAULT 54;

-- 2. Travel expenses: lisää ajoneuvotyyppi ja päivärahatyyppi
DO $$ BEGIN
  CREATE TYPE public.vehicle_type AS ENUM ('car','trailer','none');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.per_diem_type AS ENUM ('none','partial','full');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.travel_expenses
  ADD COLUMN IF NOT EXISTS vehicle_type public.vehicle_type NOT NULL DEFAULT 'car',
  ADD COLUMN IF NOT EXISTS per_diem public.per_diem_type NOT NULL DEFAULT 'none';

-- 3. Time entries: lisää company_timezone (yrityksen aikavyöhyke kirjaushetkellä)
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS company_timezone text;

-- 4. Audit log: lisää aikavyöhyketieto
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS user_timezone text,
  ADD COLUMN IF NOT EXISTS company_timezone text;