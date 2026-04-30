import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Input schema. Password is optional — when omitted we send an invite/recovery email.
const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128).optional(),
  redirectTo: z.string().url().max(2048).optional(),
});

// Map known auth errors to safe, stable messages. Anything unmapped becomes 500.
function mapAuthError(message: string | undefined): { status: number; error: string } | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes("already") && (m.includes("registered") || m.includes("exists"))) {
    return { status: 409, error: "User already exists" };
  }
  if (m.includes("invalid") && m.includes("email")) {
    return { status: 400, error: "Invalid email" };
  }
  if (m.includes("password")) {
    return { status: 400, error: "Password does not meet requirements" };
  }
  if (m.includes("rate") && m.includes("limit")) {
    return { status: 429, error: "Too many requests, try again later" };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller?.email) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerUser } = await adminClient
      .from("users")
      .select("role")
      .eq("email", caller.email)
      .single();

    if (!callerUser || callerUser.role !== "admin") {
      return json({ error: "Only admins can create auth accounts" }, 403);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { email, password, redirectTo } = parsed.data;

    // Check if auth user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const exists = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);
    if (exists) {
      if (password) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(exists.id, { password });
        if (updateError) {
          const mapped = mapAuthError(updateError.message);
          if (mapped) return json({ error: mapped.error }, mapped.status);
          console.error("updateUserById failed:", updateError);
          return json({ error: "Failed to update account" }, 500);
        }
        return json({ message: "Password updated for existing account" });
      }
      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) {
        const mapped = mapAuthError(resetError.message);
        if (mapped) return json({ error: mapped.error }, mapped.status);
        console.error("resetPasswordForEmail failed:", resetError);
        return json({ error: "Failed to send recovery email" }, 500);
      }
      return json({ message: "Password reset email sent" });
    }

    if (!password) {
      const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      if (inviteError) {
        const mapped = mapAuthError(inviteError.message);
        if (mapped) return json({ error: mapped.error }, mapped.status);
        console.error("inviteUserByEmail failed:", inviteError);
        return json({ error: "Failed to send invite" }, 500);
      }
      return json({ message: "Invite email sent", userId: invitedUser.user?.id ?? null });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      const mapped = mapAuthError(createError.message);
      if (mapped) return json({ error: mapped.error }, mapped.status);
      console.error("createUser failed:", createError);
      return json({ error: "Failed to create account" }, 500);
    }

    return json({ message: "Auth account created with password", userId: newUser.user.id });
  } catch (err) {
    console.error("create-auth-user error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
