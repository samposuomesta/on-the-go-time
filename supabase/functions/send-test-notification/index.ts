import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendWebPush } from "./web-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve caller from JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for DB writes
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Map auth user → app user (public.users)
    const { data: appUser, error: appUserErr } = await admin
      .from("users")
      .select("id")
      .eq("email", userData.user.email!)
      .single();

    if (appUserErr || !appUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load caller's own subscriptions only
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", appUser.id);

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ error: "no-subscriptions", sent: 0, failed: 0, expired: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({
      title: "Test notification",
      body: "If you see this, push works on this device 🎉",
      icon: "/manifest-icon-192.maskable.png",
      type: "test",
    });

    let sent = 0;
    let failed = 0;
    let expired = 0;
    const details: Array<{
      endpointHost: string;
      platform: string | null;
      ok: boolean;
      expired?: boolean;
      status?: number;
      error?: string;
    }> = [];

    for (const sub of subs) {
      let endpointHost = "unknown";
      try {
        endpointHost = new URL(sub.endpoint).host;
      } catch {
        // ignore
      }

      try {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY,
        );

        if (result.expired) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          expired++;
          details.push({ endpointHost, platform: sub.platform, ok: false, expired: true, status: result.status });
        } else {
          await admin
            .from("push_subscriptions")
            .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
            .eq("id", sub.id);
          sent++;
          details.push({ endpointHost, platform: sub.platform, ok: true, status: result.status });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Test push failed:", message);
        await admin
          .from("push_subscriptions")
          .update({
            last_failure_at: new Date().toISOString(),
            failure_count: (sub.failure_count ?? 0) + 1,
          })
          .eq("id", sub.id);
        failed++;
        details.push({ endpointHost, platform: sub.platform, ok: false, error: message });
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, expired, total: subs.length, details }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-test-notification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
