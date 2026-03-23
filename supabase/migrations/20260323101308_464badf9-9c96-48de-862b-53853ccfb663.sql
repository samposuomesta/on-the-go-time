CREATE TABLE public.user_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'clock_in',
  time text NOT NULL DEFAULT '08:30',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.user_reminders FOR ALL TO public USING (true) WITH CHECK (true);