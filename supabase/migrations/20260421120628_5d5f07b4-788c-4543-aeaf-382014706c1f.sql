
DO $$ BEGIN
  CREATE TYPE public.goal_category AS ENUM ('customers_sales','management','hr','production','skills','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS category public.goal_category NOT NULL DEFAULT 'other';
