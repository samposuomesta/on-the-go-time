ALTER TABLE public.companies 
  ADD COLUMN company_id_code text DEFAULT NULL,
  ADD COLUMN address text DEFAULT NULL,
  ADD COLUMN country text DEFAULT NULL;