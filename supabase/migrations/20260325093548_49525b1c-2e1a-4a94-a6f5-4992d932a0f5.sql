
CREATE TABLE public.login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  login_lat double precision,
  login_lng double precision,
  logout_lat double precision,
  logout_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.login_sessions FOR ALL TO public USING (true) WITH CHECK (true);
