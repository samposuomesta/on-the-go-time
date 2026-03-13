
-- Add status column to travel_expenses for approval workflow
ALTER TABLE public.travel_expenses ADD COLUMN IF NOT EXISTS status request_status NOT NULL DEFAULT 'pending';

-- Add status column to project_hours for approval workflow
ALTER TABLE public.project_hours ADD COLUMN IF NOT EXISTS status request_status NOT NULL DEFAULT 'pending';

-- Add employment contract start date and annual vacation days to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS contract_start_date date DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS annual_vacation_days integer NOT NULL DEFAULT 25;
