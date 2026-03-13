ALTER TABLE public.users 
ADD COLUMN daily_work_hours numeric NOT NULL DEFAULT 7.5,
ADD COLUMN auto_subtract_lunch boolean NOT NULL DEFAULT false,
ADD COLUMN lunch_threshold_hours numeric NOT NULL DEFAULT 5;