ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slack_bot_token text,
  ADD COLUMN IF NOT EXISTS slack_default_channel text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS slack_user_id text;

ALTER TABLE public.reminder_rules
  ADD COLUMN IF NOT EXISTS send_to_slack boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_reminders
  ADD COLUMN IF NOT EXISTS send_to_slack boolean NOT NULL DEFAULT false;