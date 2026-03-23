ALTER TABLE public.time_entries 
ADD COLUMN status request_status NOT NULL DEFAULT 'pending';