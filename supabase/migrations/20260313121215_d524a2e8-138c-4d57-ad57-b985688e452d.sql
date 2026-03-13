ALTER TABLE public.absence_reasons ADD COLUMN IF NOT EXISTS label_fi text;
ALTER TABLE public.reminder_rules ADD COLUMN IF NOT EXISTS message_fi text;