import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendWebPush } from "./web-push.ts";
import { sendSlackMessage } from "./slack.ts";
import { isFinnishHoliday } from "./finnish-holidays.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ReminderAction {
  userId: string;
  type: string;
  message: string;
  referenceId: string;
  sendToSlack?: boolean;
}

function getHelsinkiDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  // Helsinki day window expressed in UTC ISO strings, so we can compare against
  // timestamptz columns (start_time) without timezone confusion.
  // Europe/Helsinki = UTC+2 (winter) or UTC+3 (summer DST). We compute the offset
  // dynamically from the formatted parts vs UTC.
  const helsinkiHour = parseInt(get("hour"), 10);
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const helsinkiMinute = parseInt(get("minute"), 10);
  // Compute offset in minutes: (helsinki - utc) mod 1440
  let offsetMinutes = (helsinkiHour * 60 + helsinkiMinute) - (utcHour * 60 + utcMinute);
  if (offsetMinutes < -720) offsetMinutes += 1440;
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  const offsetHours = Math.floor(offsetMinutes / 60);
  const offsetMins = offsetMinutes % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, "0")}:${String(Math.abs(offsetMins)).padStart(2, "0")}`;

  const todayStr = `${get("year")}-${get("month")}-${get("day")}`;

  return {
    currentTime: `${get("hour")}:${get("minute")}`,
    todayStr,
    dayOfWeek: weekdayMap[weekdayStr] ?? 1,
    // ISO timestamps with explicit offset, safe for timestamptz comparison
    dayStartUtc: `${todayStr}T00:00:00${offsetStr}`,
    dayEndUtc: `${todayStr}T23:59:59${offsetStr}`,
  };
}

function getISOWeekNumber(date: Date): { week: number; year: number } {
  // Helsinki-zoned ISO week
  const helsinki = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Helsinki" }));
  const d = new Date(Date.UTC(helsinki.getFullYear(), helsinki.getMonth(), helsinki.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // No authentication required: this function is idempotent (notification_log dedup),
  // sends only pre-scheduled reminders to opted-in users, and exposes no user input or PII.
  // Anyone calling it can at most fire reminders that are already due to be sent.

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const { currentTime, todayStr, dayOfWeek, dayStartUtc, dayEndUtc } = getHelsinkiDateParts(now);
    const { week: isoWeek, year: isoYear } = getISOWeekNumber(now);

    // Cron now runs every 3 minutes (weekdays) / hourly (weekends), but users
    // configure reminders to the minute. Build a small lookback window so that
    // reminders set for e.g. 08:31 still fire when cron triggers at 08:33.
    // notification_log dedup prevents duplicates within the same day/reference.
    const WINDOW_MINUTES = 60; // covers both 3-min and 60-min cron rasters
    const windowTimes: string[] = [];
    for (let i = 0; i < WINDOW_MINUTES; i++) {
      const t = new Date(now.getTime() - i * 60_000);
      const { currentTime: ct } = getHelsinkiDateParts(t);
      if (!windowTimes.includes(ct)) windowTimes.push(ct);
    }

    // Weekend / Finnish public holiday check (Helsinki time)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = isFinnishHoliday(todayStr);
    const skipWorkdayReminders = isWeekend || isHoliday;

    // Cache for "is user on absence/vacation today?" lookups
    const absenceCache = new Map<string, boolean>();
    const isUserAbsentToday = async (userId: string): Promise<boolean> => {
      if (absenceCache.has(userId)) return absenceCache.get(userId)!;

      // Approved vacation covering today
      const { data: vacs } = await supabase
        .from("vacation_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .lte("start_date", todayStr)
        .gte("end_date", todayStr)
        .limit(1);

      let absent = !!(vacs && vacs.length > 0);

      // Sick leave / other absences covering today
      if (!absent) {
        const { data: abs } = await supabase
          .from("absences")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "approved")
          .lte("start_date", todayStr)
          .gte("end_date", todayStr)
          .limit(1);
        absent = !!(abs && abs.length > 0);
      }

      absenceCache.set(userId, absent);
      return absent;
    };

    const actions: ReminderAction[] = [];

    // 1. Clock-in / clock-out personal reminders (skip on weekends, holidays, and when user is absent)
    const { data: userReminders } = skipWorkdayReminders ? { data: [] as any[] } : await supabase
      .from("user_reminders")
      .select("*")
      .eq("enabled", true)
      .in("time", windowTimes);

    if (userReminders) {
      for (const r of userReminders) {
        if (await isUserAbsentToday(r.user_id)) continue;

        if (r.type === "clock_in") {
          const { data: entries } = await supabase
            .from("time_entries")
            .select("id")
            .eq("user_id", r.user_id)
            .gte("start_time", dayStartUtc)
            .lte("start_time", dayEndUtc)
            .limit(1);

          if (!entries || entries.length === 0) {
            actions.push({
              userId: r.user_id,
              type: "clock_in",
              message: "⏰ Don't forget to clock in today!",
              referenceId: `clock_in_${todayStr}`,
              sendToSlack: r.send_to_slack === true,
            });
          }
        } else if (r.type === "clock_out") {
          const { data: openEntries } = await supabase
            .from("time_entries")
            .select("id")
            .eq("user_id", r.user_id)
            .is("end_time", null)
            .gte("start_time", dayStartUtc)
            .limit(1);

          if (openEntries && openEntries.length > 0) {
            actions.push({
              userId: r.user_id,
              type: "clock_out",
              message: "🔔 Don't forget to clock out!",
              referenceId: `clock_out_${todayStr}`,
              sendToSlack: r.send_to_slack === true,
            });
          }
        }
      }
    }

    // 2. Vacation pending reminders (for managers) — skip on weekends
    const { data: vacPendingReminders } = isWeekend ? { data: [] as any[] } : await supabase
      .from("user_reminders")
      .select("*")
      .eq("enabled", true)
      .eq("type", "vacation_pending")
      .in("time", windowTimes);

    if (vacPendingReminders) {
      for (const r of vacPendingReminders) {
        const { data: pendingVacs } = await supabase
          .from("vacation_requests")
          .select("id")
          .eq("status", "pending")
          .limit(1);

        if (pendingVacs && pendingVacs.length > 0) {
          actions.push({
            userId: r.user_id,
            type: "vacation_pending",
            message: "📋 You have pending vacation requests to review",
            referenceId: `vac_pending_${todayStr}`,
            sendToSlack: r.send_to_slack === true,
          });
        }
      }
    }

    // 2b. Weekly goal reminders (per-user weekday + time) — skip on weekends and holidays
    const { data: weeklyGoalReminders } = skipWorkdayReminders ? { data: [] as any[] } : await supabase
      .from("user_reminders")
      .select("*")
      .eq("enabled", true)
      .eq("type", "weekly_goal")
      .in("time", windowTimes)
      .eq("day_of_week", dayOfWeek);

    if (weeklyGoalReminders) {
      for (const r of weeklyGoalReminders) {
        if (await isUserAbsentToday(r.user_id)) continue;
        // Check if user has set + rated current week's goals
        const { data: weekGoals } = await supabase
          .from("weekly_goals")
          .select("id, rated_at")
          .eq("user_id", r.user_id)
          .eq("week_number", isoWeek)
          .eq("year", isoYear)
          .eq("is_admin_assigned", false)
          .limit(1);

        const hasGoals = weekGoals && weekGoals.length > 0;
        const isRated = hasGoals && weekGoals[0].rated_at !== null;

        if (!hasGoals) {
          actions.push({
            userId: r.user_id,
            type: "weekly_goal",
            message: "🎯 Aseta tämän viikon tavoitteet",
            referenceId: `weekly_goal_set_${isoYear}_${isoWeek}`,
            sendToSlack: r.send_to_slack === true,
          });
        } else if (!isRated) {
          actions.push({
            userId: r.user_id,
            type: "weekly_goal",
            message: "⭐ Muista arvioida viikon tavoitteet",
            referenceId: `weekly_goal_rate_${isoYear}_${isoWeek}`,
            sendToSlack: r.send_to_slack === true,
          });
        }
      }
    }

    // 3. Vacation status change reminders (for employees)
    const { data: vacStatusReminders } = await supabase
      .from("user_reminders")
      .select("*")
      .eq("enabled", true)
      .eq("type", "vacation_status");

    if (vacStatusReminders) {
      for (const r of vacStatusReminders) {
        const { data: updatedVacs } = await supabase
          .from("vacation_requests")
          .select("id, status")
          .eq("user_id", r.user_id)
          .in("status", ["approved", "rejected"]);

        if (updatedVacs) {
          for (const vac of updatedVacs) {
            const refId = `vac_status_${vac.id}_${vac.status}`;
            actions.push({
              userId: r.user_id,
              type: "vacation_status",
              message:
                vac.status === "approved"
                  ? "✅ Your vacation request has been approved!"
                  : "❌ Your vacation request has been declined.",
              referenceId: refId,
              sendToSlack: r.send_to_slack === true,
            });
          }
        }
      }
    }

    // Deduplicate: filter out already-sent notifications
    const filteredActions: ReminderAction[] = [];
    for (const action of actions) {
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", action.userId)
        .eq("type", action.type)
        .eq("reference_id", action.referenceId)
        .limit(1);

      if (!existing || existing.length === 0) {
        filteredActions.push(action);
      }
    }

    // Send push notifications + Slack
    let sent = 0;
    let slackSent = 0;
    let slackFailed = 0;

    // Cache: company_id -> { token, channel } and user_id -> { company_id, slack_user_id }
    const userCache = new Map<string, { company_id: string; slack_user_id: string | null } | null>();
    const companyCache = new Map<string, { slack_bot_token: string | null; slack_default_channel: string | null } | null>();

    const getUserMeta = async (userId: string) => {
      if (userCache.has(userId)) return userCache.get(userId) ?? null;
      const { data } = await supabase
        .from("users")
        .select("company_id, slack_user_id")
        .eq("id", userId)
        .maybeSingle();
      const meta = data ? { company_id: data.company_id as string, slack_user_id: (data as any).slack_user_id ?? null } : null;
      userCache.set(userId, meta);
      return meta;
    };

    const getCompanyMeta = async (companyId: string) => {
      if (companyCache.has(companyId)) return companyCache.get(companyId) ?? null;
      const { data } = await supabase
        .from("company_secrets")
        .select("slack_bot_token, slack_default_channel")
        .eq("company_id", companyId)
        .maybeSingle();
      const meta = data ? { slack_bot_token: (data as any).slack_bot_token ?? null, slack_default_channel: (data as any).slack_default_channel ?? null } : null;
      companyCache.set(companyId, meta);
      return meta;
    };

    for (const action of filteredActions) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", action.userId);

      if (subs && subs.length > 0) {
        for (const sub of subs) {
          try {
            const result = await sendWebPush(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              JSON.stringify({
                title: "TimeTrack",
                body: action.message,
                type: action.type,
                icon: "/manifest-icon-192.maskable.png",
              }),
              VAPID_PUBLIC_KEY,
              VAPID_PRIVATE_KEY,
            );

            if (result.expired) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              await supabase
                .from("push_subscriptions")
                .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
                .eq("id", sub.id);
            }
          } catch (e) {
            console.error(`Push failed for ${action.userId}:`, e);
            await supabase
              .from("push_subscriptions")
              .update({
                last_failure_at: new Date().toISOString(),
                failure_count: (sub.failure_count ?? 0) + 1,
              })
              .eq("id", sub.id);
          }
        }
      }

      // Slack delivery (in addition to push)
      if (action.sendToSlack) {
        const userMeta = await getUserMeta(action.userId);
        if (userMeta?.slack_user_id && userMeta.company_id) {
          const companyMeta = await getCompanyMeta(userMeta.company_id);
          if (companyMeta?.slack_bot_token) {
            const slackResult = await sendSlackMessage(
              companyMeta.slack_bot_token,
              userMeta.slack_user_id,
              action.message,
            );
            if (slackResult.ok) {
              slackSent++;
            } else {
              slackFailed++;
              console.warn(`Slack send failed for ${action.userId}: ${slackResult.error}`);
            }
          }
        }
      }

      // Log the notification
      await supabase.from("notification_log").insert({
        user_id: action.userId,
        type: action.type,
        reference_id: action.referenceId,
      });

      sent++;
    }

    return new Response(
      JSON.stringify({
        processed: actions.length,
        sent,
        slackSent,
        slackFailed,
        deduplicated: actions.length - filteredActions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Process reminders error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
