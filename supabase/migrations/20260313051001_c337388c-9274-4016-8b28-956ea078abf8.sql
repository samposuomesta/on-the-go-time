
-- Enum types
CREATE TYPE public.user_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE public.absence_type AS ENUM ('sick', 'absence');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.bank_transaction_type AS ENUM ('work', 'overtime', 'vacation', 'sick', 'adjustment');

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  km_rate NUMERIC(6,3) NOT NULL DEFAULT 0.25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (no auth for demo)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'employee',
  manager_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  customer TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  end_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project hours (manual)
CREATE TABLE public.project_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  hours NUMERIC(5,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Travel expenses
CREATE TABLE public.travel_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  kilometers NUMERIC(8,1) DEFAULT 0,
  parking_cost NUMERIC(8,2) DEFAULT 0,
  description TEXT,
  receipt_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Absences
CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.absence_type NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.request_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vacation requests
CREATE TABLE public.vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  comment TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Work bank transactions
CREATE TABLE public.work_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.bank_transaction_type NOT NULL,
  hours NUMERIC(6,2) NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workplaces (GPS locations)
CREATE TABLE public.workplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled with open policies for demo
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.project_hours FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.travel_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.absences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.vacation_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.work_bank_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.workplaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_start ON public.time_entries(start_time);
CREATE INDEX idx_project_hours_user ON public.project_hours(user_id);
CREATE INDEX idx_travel_expenses_user ON public.travel_expenses(user_id);
CREATE INDEX idx_absences_user ON public.absences(user_id);
CREATE INDEX idx_vacation_requests_user ON public.vacation_requests(user_id);
