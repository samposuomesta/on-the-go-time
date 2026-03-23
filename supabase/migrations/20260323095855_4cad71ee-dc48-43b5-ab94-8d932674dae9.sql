ALTER TABLE public.reminder_rules
  ADD COLUMN IF NOT EXISTS day_of_month integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resend_after_days integer DEFAULT NULL;