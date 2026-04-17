
This is a substantial plan touching Settings, the push hook, the SW, the edge function, and adding a test-send function. I have enough context already (Settings.tsx, usePushSubscription.ts, sw.js, process-reminders, push_subscriptions schema, i18n) to plan without more file reads. Email fallback (#9) requires email infra that isn't set up — I'll flag that as optional/deferred to keep this focused.

Key decisions:
- Add columns to `push_subscriptions` (`user_agent`, `platform`, `last_success_at`, `last_failure_at`, `failure_count`) via migration so iOS endpoints are identifiable and dead subs can be pruned.
- New "Notifications" section in Settings with: status badges (support / standalone / permission), Enable button, iOS install banner, Test button, list of subscribed devices with revoke.
- Refactor `usePushSubscription` to surface diagnostics + verbose logs and never auto-prompt.
- New edge function `send-test-notification` (auth-required, sends to caller's own subscriptions only, reuses existing `web-push.ts`).
- SW: ensure non-empty payload defaults are robust; registration already at `/sw.js` with default scope `/` — keep as is, just confirm.
- Defer email fallback (#9) — would require setting up email infra; I'll note it as a follow-up.
