
-- Custom absence reasons per company
CREATE TABLE public.absence_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.absence_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.absence_reasons FOR ALL TO public USING (true) WITH CHECK (true);

-- Add reason reference to absences
ALTER TABLE public.absences ADD COLUMN reason_id uuid REFERENCES public.absence_reasons(id) DEFAULT NULL;
