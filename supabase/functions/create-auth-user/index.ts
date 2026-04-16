import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their token
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller role from users table
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerUser } = await adminClient
      .from("users")
      .select("role")
      .eq("email", caller.email)
      .single();

    if (!callerUser || callerUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create auth accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, redirectTo } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if auth user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const exists = existingUsers?.users?.find((u) => u.email === email);
    if (exists) {
      if (password) {
        // Update existing user's password
        await adminClient.auth.admin.updateUserById(exists.id, { password });
        return new Response(JSON.stringify({ message: "Password updated for existing account" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // No password provided, send recovery email
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      return new Response(JSON.stringify({ message: "Password reset email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user with admin-provided password or a random one
    const userPassword = password || (crypto.randomUUID() + crypto.randomUUID());
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no password was provided, send recovery email
    if (!password) {
      const { error: resetError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      if (resetError) {
        console.error("Failed to generate recovery link:", resetError);
      }
    }

    return new Response(
      JSON.stringify({ message: password ? "Auth account created with password" : "Auth account created and reset email sent", userId: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
