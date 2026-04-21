ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'benefit_car';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'company_car';

ALTER TABLE public.travel_expenses
  ADD COLUMN IF NOT EXISTS trip_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS trip_end timestamp with time zone;