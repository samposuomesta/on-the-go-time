import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push utilities using VAPID
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const raw = atob(base64 + pad);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importVapidKeys() {
  const rawPrivate = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const rawPublic = base64UrlToUint8Array(VAPID_PUBLIC_KEY);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    await crypto.subtle.exportKey(
      "pkcs8",
      await crypto.subtle.importKey("jwk", {
        kty: "EC", crv: "P-256",
        d: uint8ArrayToBase64Url(rawPrivate),
        x: uint8ArrayToBase64Url(rawPublic.slice(1, 33)),
        y: uint8ArrayToBase64Url(rawPublic.slice(33, 65)),
      }, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"])
    ),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return { privateKey, rawPublic };
}

async function createJwt(audience: string, privateKey: CryptoKey): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:noreply@timetrack.app",
  };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(unsigned)
  );

  // Convert DER signature to raw r||s format
  const derSig = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;
  if (derSig[0] === 0x30) {
    // DER format
    const rLen = derSig[3];
    const rBytes = derSig.slice(4, 4 + rLen);
    const sLen = derSig[5 + rLen];
    const sBytes = derSig.slice(6 + rLen, 6 + rLen + sLen);
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    if (r.length < 32) { const pad = new Uint8Array(32); pad.set(r, 32 - r.length); r = pad; }
    if (s.length < 32) { const pad = new Uint8Array(32); pad.set(s, 32 - s.length); s = pad; }
  } else {
    // Already raw
    r = derSig.slice(0, 32);
    s = derSig.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsigned}.${uint8ArrayToBase64Url(rawSig)}`;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  privateKey: CryptoKey,
  rawPublicKey: Uint8Array
) {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createJwt(audience, privateKey);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${uint8ArrayToBase64Url(rawPublicKey)}`,
    },
    body: new TextEncoder().encode(payload),
  });

  if (!response.ok && response.status === 410) {
    // Subscription expired, should be cleaned up
    return { expired: true };
  }

  return { expired: false, status: response.status };
}

interface ReminderAction {
  userId: string;
  type: string;
  message: string;
  referenceId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const currentTime = now.toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Helsinki",
    });
    const todayStr = now.toISOString().slice(0, 10);

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
          // Check if user already has a time entry started today
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
          // Check if user has an open time entry (no end_time)
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
        // Find vacation requests that were updated (approved/rejected) and not yet notified
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
    let vapidKeys: { privateKey: CryptoKey; rawPublic: Uint8Array } | null = null;

    if (filteredActions.length > 0) {
      try {
        vapidKeys = await importVapidKeys();
      } catch (e) {
        console.error("Failed to import VAPID keys:", e);
      }
    }

    for (const action of filteredActions) {
      // Get user's push subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", action.userId);

      if (subs && subs.length > 0 && vapidKeys) {
        for (const sub of subs) {
          try {
            const result = await sendWebPush(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              JSON.stringify({ title: "TimeTrack", body: action.message, type: action.type }),
              vapidKeys.privateKey,
              vapidKeys.rawPublic
            );

            if (result.expired) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          } catch (e) {
            console.error(`Push failed for ${action.userId}:`, e);
          }
        }
      }

      // Log the notification (even if no push sub, to avoid re-checking)
      await supabase.from("notification_log").insert({
        user_id: action.userId,
        type: action.type,
        reference_id: action.referenceId,
      });

      sent++;
    }

    return new Response(
      JSON.stringify({ processed: actions.length, sent, deduplicated: actions.length - filteredActions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
