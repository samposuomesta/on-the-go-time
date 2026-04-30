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

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

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
      return json({ error: "Only admins can delete users" }, 403);
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
    const { email } = parsed.data;

    // Prevent admins from deleting themselves via this endpoint
    if (caller.email.toLowerCase() === email) {
      return json({ error: "You cannot delete your own auth account" }, 400);
    }

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const authUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);

    if (authUser) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUser.id);
      if (deleteError) {
        console.error("deleteUser failed:", deleteError);
        return json({ error: "Failed to delete auth account" }, 500);
      }
    }

    return json({ message: "Auth user deleted successfully" });
  } catch (err) {
    console.error("delete-auth-user error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
