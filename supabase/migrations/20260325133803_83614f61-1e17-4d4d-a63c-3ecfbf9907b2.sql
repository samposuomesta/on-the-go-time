ALTER TABLE public.travel_expenses ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.travel_expenses ADD COLUMN IF NOT EXISTS route text;