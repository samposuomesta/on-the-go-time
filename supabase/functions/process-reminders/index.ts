import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendWebPush } from "./web-push.ts";

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
}

function getHelsinkiDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    currentTime: `${get("hour")}:${get("minute")}`,
    todayStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: require either CRON_SECRET header or service-role Authorization
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const validCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");
  const validServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!validCron && !validServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const { currentTime, todayStr } = getHelsinkiDateParts(now);

    const actions: ReminderAction[] = [];

    // 1. Clock-in / clock-out personal reminders
    const { data: userReminders } = await supabase
      .from("user_reminders")
      .select("*")
      .eq("enabled", true)
      .eq("time", currentTime);

    if (userReminders) {
      for (const r of userReminders) {
        if (r.type === "clock_in") {
          const { data: entries } = await supabase
            .from("time_entries")
            .select("id")
            .eq("user_id", r.user_id)
            .gte("start_time", `${todayStr}T00:00:00`)
            .lte("start_time", `${todayStr}T23:59:59`)
            .limit(1);

          if (!entries || entries.length === 0) {
            actions.push({
              userId: r.user_id,
              type: "clock_in",
              message: "⏰ Don't forget to clock in today!",
              referenceId: `clock_in_${todayStr}`,
            });
          }
        } else if (r.type === "clock_out") {
          const { data: openEntries } = await supabase
            .from("time_entries")
            .select("id")
            .eq("user_id", r.user_id)
            .is("end_time", null)
            .gte("start_time", `${todayStr}T00:00:00`)
            .limit(1);

          if (openEntries && openEntries.length > 0) {
            actions.push({
              userId: r.user_id,
              type: "clock_out",
              message: "🔔 Don't forget to clock out!",
              referenceId: `clock_out_${todayStr}`,
            });
          }
        }
      }
    }

    // 2. Vacation pending reminders (for managers)
    const { data: vacPendingReminders } = await supabase
      .from("user_reminders")
      .select("*")
      .eq("enabled", true)
      .eq("type", "vacation_pending")
      .eq("time", currentTime);

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

    // Send push notifications
    let sent = 0;

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

      // Log the notification
      await supabase.from("notification_log").insert({
        user_id: action.userId,
        type: action.type,
        reference_id: action.referenceId,
      });

      sent++;
    }

    return new Response(
      JSON.stringify({ processed: actions.length, sent, deduplicated: actions.length - filteredActions.length }),
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
