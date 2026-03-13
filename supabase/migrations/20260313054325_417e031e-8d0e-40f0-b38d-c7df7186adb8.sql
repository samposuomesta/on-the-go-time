
CREATE TABLE public.reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'clock_in',
  time text NOT NULL DEFAULT '08:30',
  enabled boolean NOT NULL DEFAULT true,
  message text NOT NULL DEFAULT 'Reminder',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.reminder_rules FOR ALL USING (true) WITH CHECK (true);
