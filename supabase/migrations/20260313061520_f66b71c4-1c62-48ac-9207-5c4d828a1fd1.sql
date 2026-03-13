
-- Many-to-many junction table for employee-manager relationships
CREATE TABLE public.user_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, manager_id),
  CHECK (user_id != manager_id)
);

-- Allow all access (matching existing RLS pattern)
ALTER TABLE public.user_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.user_managers
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);
