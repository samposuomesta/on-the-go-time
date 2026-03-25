ALTER TABLE public.users ADD COLUMN timezone text DEFAULT 'Europe/Helsinki';
ALTER TABLE public.time_entries ADD COLUMN timezone text DEFAULT NULL;