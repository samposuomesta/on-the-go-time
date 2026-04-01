-- seed-defaults.sql
-- Idempotent seed: creates a default company and admin user.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

INSERT INTO public.companies (id, name, country)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Default Company',
  'FI'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, company_id, name, email, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  'admin@timetrack.local',
  'admin'
) ON CONFLICT (id) DO NOTHING;
