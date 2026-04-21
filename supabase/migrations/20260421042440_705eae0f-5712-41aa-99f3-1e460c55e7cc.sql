-- 1) teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_company ON public.teams(company_id);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY tm_select ON public.teams FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id());
CREATE POLICY tm_insert ON public.teams FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');
CREATE POLICY tm_update ON public.teams FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id());
CREATE POLICY tm_delete ON public.teams FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- 2) user_teams
CREATE TABLE public.user_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
CREATE INDEX idx_user_teams_user ON public.user_teams(user_id);
CREATE INDEX idx_user_teams_team ON public.user_teams(team_id);
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_team_in_my_company(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = _team_id AND company_id = auth_user_company_id())
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_team(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_teams WHERE team_id = _team_id AND user_id = auth_user_id())
$$;

CREATE OR REPLACE FUNCTION public.user_shares_team_with_me(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_teams ut1
    JOIN public.user_teams ut2 ON ut1.team_id = ut2.team_id
    WHERE ut1.user_id = auth_user_id() AND ut2.user_id = _user_id
  )
$$;

CREATE POLICY ut_select ON public.user_teams FOR SELECT TO authenticated
  USING (is_team_in_my_company(team_id));
CREATE POLICY ut_insert ON public.user_teams FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'admin' AND is_team_in_my_company(team_id));
CREATE POLICY ut_delete ON public.user_teams FOR DELETE TO authenticated
  USING (auth_user_role() = 'admin' AND is_team_in_my_company(team_id));

-- 3) goal_templates
CREATE TABLE public.goal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_goal_templates_company ON public.goal_templates(company_id);
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY gt_select ON public.goal_templates FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id());
CREATE POLICY gt_insert ON public.goal_templates FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');
CREATE POLICY gt_update ON public.goal_templates FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id());
CREATE POLICY gt_delete ON public.goal_templates FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- 4) weekly_goals
CREATE TABLE public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year smallint NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  template_id uuid REFERENCES public.goal_templates(id) ON DELETE SET NULL,
  template_name text,
  is_admin_assigned boolean NOT NULL DEFAULT false,
  rated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_number, year)
);
CREATE INDEX idx_weekly_goals_user ON public.weekly_goals(user_id);
CREATE INDEX idx_weekly_goals_week ON public.weekly_goals(year, week_number);
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY wg_select ON public.weekly_goals FOR SELECT TO authenticated
  USING (
    user_id = auth_user_id()
    OR (auth_user_role() = 'admin' AND is_same_company_user(user_id))
    OR (auth_user_role() = 'manager' AND is_same_company_user(user_id) AND user_shares_team_with_me(user_id))
  );
CREATE POLICY wg_insert ON public.weekly_goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));
CREATE POLICY wg_update ON public.weekly_goals FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));
CREATE POLICY wg_delete ON public.weekly_goals FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_weekly_goals_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_weekly_goals_updated_at
BEFORE UPDATE ON public.weekly_goals
FOR EACH ROW EXECUTE FUNCTION public.update_weekly_goals_updated_at();

-- 5) goals
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_goal_id uuid NOT NULL REFERENCES public.weekly_goals(id) ON DELETE CASCADE,
  text text NOT NULL,
  rating smallint CHECK (rating BETWEEN 1 AND 4),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_weekly ON public.goals(weekly_goal_id);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.weekly_goal_owner(_wg_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.weekly_goals WHERE id = _wg_id
$$;

CREATE POLICY g_select ON public.goals FOR SELECT TO authenticated
  USING (
    weekly_goal_owner(weekly_goal_id) = auth_user_id()
    OR (auth_user_role() = 'admin' AND is_same_company_user(weekly_goal_owner(weekly_goal_id)))
    OR (auth_user_role() = 'manager' AND user_shares_team_with_me(weekly_goal_owner(weekly_goal_id)))
  );
CREATE POLICY g_insert ON public.goals FOR INSERT TO authenticated
  WITH CHECK (
    weekly_goal_owner(weekly_goal_id) = auth_user_id()
    OR (auth_user_role() = 'admin' AND is_same_company_user(weekly_goal_owner(weekly_goal_id)))
  );
CREATE POLICY g_update ON public.goals FOR UPDATE TO authenticated
  USING (
    weekly_goal_owner(weekly_goal_id) = auth_user_id()
    OR (auth_user_role() = 'admin' AND is_same_company_user(weekly_goal_owner(weekly_goal_id)))
  )
  WITH CHECK (
    weekly_goal_owner(weekly_goal_id) = auth_user_id()
    OR (auth_user_role() = 'admin' AND is_same_company_user(weekly_goal_owner(weekly_goal_id)))
  );
CREATE POLICY g_delete ON public.goals FOR DELETE TO authenticated
  USING (
    weekly_goal_owner(weekly_goal_id) = auth_user_id()
    OR (auth_user_role() = 'admin' AND is_same_company_user(weekly_goal_owner(weekly_goal_id)))
  );

CREATE TRIGGER trg_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.update_weekly_goals_updated_at();

-- 6) scheduled_goals
CREATE TABLE public.scheduled_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.goal_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year smallint NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id, week_number, year)
);
CREATE INDEX idx_scheduled_goals_user ON public.scheduled_goals(user_id);
CREATE INDEX idx_scheduled_goals_week ON public.scheduled_goals(year, week_number);
ALTER TABLE public.scheduled_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY sg_select ON public.scheduled_goals FOR SELECT TO authenticated
  USING (
    user_id = auth_user_id()
    OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id))
  );
CREATE POLICY sg_insert ON public.scheduled_goals FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'admin' AND is_same_company_user(user_id));
CREATE POLICY sg_update ON public.scheduled_goals FOR UPDATE TO authenticated
  USING (auth_user_role() = 'admin' AND is_same_company_user(user_id))
  WITH CHECK (auth_user_role() = 'admin' AND is_same_company_user(user_id));
CREATE POLICY sg_delete ON public.scheduled_goals FOR DELETE TO authenticated
  USING (auth_user_role() = 'admin' AND is_same_company_user(user_id));

-- 7) user_reminders.day_of_week
ALTER TABLE public.user_reminders
  ADD COLUMN day_of_week smallint NULL CHECK (day_of_week BETWEEN 0 AND 6);
COMMENT ON COLUMN public.user_reminders.day_of_week IS '0=Sunday..6=Saturday. NULL = every day (used for daily reminders). Required for weekly_goal type.';