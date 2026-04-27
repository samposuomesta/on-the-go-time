import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isFinnishHoliday } from "./finnish-holidays.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Helpers ──────────────────────────────────────────────────────────────

function errorResponse(
  code: string,
  message: string,
  status: number
): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Map Postgres / PostgREST errors to user-friendly responses
function mapPgError(error: any): { status: number; code: string; message: string } {
  console.error("DB error:", error);
  const code = error?.code;
  const msg = error?.message || "Database error";

  // Postgres invalid input syntax (e.g. bad date, bad uuid, bad enum)
  // 22007 invalid_datetime_format, 22008 datetime_field_overflow,
  // 22P02 invalid_text_representation, 22023 invalid_parameter_value
  if (code === "22007" || code === "22008" || code === "22P02" || code === "22023") {
    return { status: 400, code: "VALIDATION_ERROR", message: msg };
  }
  // PostgREST parse / filter errors
  if (code === "PGRST100" || code === "PGRST103" || code === "PGRST116") {
    return { status: 400, code: "VALIDATION_ERROR", message: msg };
  }
  return { status: 500, code: "INTERNAL_ERROR", message: "Internal server error" };
}

// ── Main handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  // ── Auth ───────────────────────────────────────────────────────────────
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return errorResponse("INVALID_API_KEY", "Missing X-API-Key header.", 401);
  }

  const keyHash = await sha256(apiKey);
  const { data: keyRow, error: keyErr } = await db
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .maybeSingle();

  if (keyErr || !keyRow) {
    return errorResponse(
      "INVALID_API_KEY",
      "The provided API key is invalid or inactive.",
      401
    );
  }

  const companyId: string = keyRow.company_id;
  const permissions: { read?: string[]; write?: string[] } =
    keyRow.permissions ?? { read: [], write: [] };
  const rateLimit: number = keyRow.rate_limit ?? 1000;

  // ── Rate limit ─────────────────────────────────────────────────────────
  // We use a direct upsert for rate limiting
  const { data: rlData, error: rlErr } = await db
    .from("api_rate_limits")
    .upsert(
      {
        api_key_id: keyRow.id,
        window_start: new Date(
          Math.floor(Date.now() / 3600000) * 3600000
        ).toISOString(),
        request_count: 1,
      },
      { onConflict: "api_key_id,window_start" }
    )
    .select("request_count")
    .single();

  // If upsert worked but count not incremented properly, do an update
  if (!rlErr && rlData) {
    // The upsert with supabase-js doesn't support DO UPDATE SET x = x + 1
    // So we read + update
    const { data: currentRl } = await db
      .from("api_rate_limits")
      .select("request_count")
      .eq("api_key_id", keyRow.id)
      .eq(
        "window_start",
        new Date(
          Math.floor(Date.now() / 3600000) * 3600000
        ).toISOString()
      )
      .single();

    if (currentRl) {
      const newCount = (currentRl.request_count ?? 0) + 1;
      await db
        .from("api_rate_limits")
        .update({ request_count: newCount })
        .eq("api_key_id", keyRow.id)
        .eq(
          "window_start",
          new Date(
            Math.floor(Date.now() / 3600000) * 3600000
          ).toISOString()
        );

      if (newCount > rateLimit) {
        return errorResponse(
          "RATE_LIMIT_EXCEEDED",
          `Rate limit of ${rateLimit} requests/hour exceeded.`,
          429
        );
      }
    }
  }

  // Update last_used_at (fire and forget)
  db.from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(() => {});

  // ── Routing ────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /data-api/{resource}
  const resource = pathParts[pathParts.length - 1] || "";
  const method = req.method;

  let statusCode = 200;
  let responseBody: unknown;

  try {
    if (method === "GET") {
      const resourceKey = resource === "changes" ? "changes" : resource.replace(/-/g, "_");
      if (!permissions.read?.includes(resourceKey)) {
        return errorResponse("FORBIDDEN", `No read permission for '${resource}'.`, 403);
      }

      const params = Object.fromEntries(url.searchParams.entries());
      const limit = Math.min(parseInt(params.limit || "100"), 1000);
      const cursorCreatedAt = params.cursor_created_at || null;
      const cursorId = params.cursor_id || null;

      responseBody = await handleGet(
        db, companyId, resource, params, limit, cursorCreatedAt, cursorId
      );
    } else if (method === "POST") {
      const resourceKey = resource.replace(/-/g, "_");
      if (!permissions.write?.includes(resourceKey)) {
        return errorResponse("FORBIDDEN", `No write permission for '${resource}'.`, 403);
      }

      const idempotencyKey = req.headers.get("idempotency-key");
      if (!idempotencyKey) {
        return errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "POST requests require an Idempotency-Key header.",
          400
        );
      }

      // Check idempotency
      const { data: existingIdem } = await db
        .from("idempotency_keys")
        .select("response_status, response_body")
        .eq("api_key_id", keyRow.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingIdem) {
        return jsonResponse(existingIdem.response_body, existingIdem.response_status);
      }

      const body = await req.json();
      const result = await handlePost(db, companyId, resource, body);
      statusCode = 201;
      responseBody = result;

      // Store idempotency response
      await db.from("idempotency_keys").insert({
        api_key_id: keyRow.id,
        idempotency_key: idempotencyKey,
        response_status: statusCode,
        response_body: result,
      });
    } else {
      return errorResponse("METHOD_NOT_ALLOWED", `Method ${method} not allowed.`, 405);
    }
  } catch (err: any) {
    if (err.status) {
      statusCode = err.status;
      responseBody = { error: { code: err.code, message: err.message } };
    } else {
      console.error("Data API internal error:", err);
      statusCode = 500;
      responseBody = {
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      };
    }
  }

  // ── Log ────────────────────────────────────────────────────────────────
  const elapsed = Date.now() - startTime;
  db.from("api_logs")
    .insert({
      api_key_id: keyRow.id,
      endpoint: `${method} /${resource}`,
      status_code: statusCode,
      response_time_ms: elapsed,
    })
    .then(() => {});

  // ── Opportunistic cleanup (~1% of requests) ───────────────────────────
  if (Math.random() < 0.01) {
    db.from("idempotency_keys")
      .delete()
      .lt("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .then(() => {});
    db.from("api_logs")
      .delete()
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .then(() => {});
    // Clean old rate limit windows too
    db.from("api_rate_limits")
      .delete()
      .lt("window_start", new Date(Date.now() - 48 * 3600000).toISOString())
      .then(() => {});
  }

  return jsonResponse(responseBody, statusCode);
});

// ── GET handler ──────────────────────────────────────────────────────────

async function handleGet(
  db: any,
  companyId: string,
  resource: string,
  params: Record<string, string>,
  limit: number,
  cursorCreatedAt: string | null,
  cursorId: string | null
) {
  switch (resource) {
    case "time-entries":
      return queryWithCompanyUsers(db, companyId, "time_entries", params, limit, cursorCreatedAt, cursorId, {
        dateField: "start_time",
        filters: ["status", "project_id"],
      });
    case "absences":
      return queryWithCompanyUsers(db, companyId, "absences", params, limit, cursorCreatedAt, cursorId, {
        dateField: "start_date",
        filters: ["status", "type"],
      });
    case "travel-expenses":
      return queryWithCompanyUsers(db, companyId, "travel_expenses", params, limit, cursorCreatedAt, cursorId, {
        dateField: "date",
        filters: ["status", "project_id"],
      });
    case "vacation-requests":
      return queryWithCompanyUsers(db, companyId, "vacation_requests", params, limit, cursorCreatedAt, cursorId, {
        dateField: "start_date",
        filters: ["status"],
      });
    case "project-hours":
      return queryWithCompanyUsers(db, companyId, "project_hours", params, limit, cursorCreatedAt, cursorId, {
        dateField: "date",
        filters: ["status", "project_id"],
      });
    case "projects":
      return queryDirectCompany(db, companyId, "projects", params, limit, cursorCreatedAt, cursorId);
    case "absence-reasons":
      return queryDirectCompany(db, companyId, "absence_reasons", params, limit, cursorCreatedAt, cursorId);
    case "weekly-goals":
      return queryWeeklyGoals(db, companyId, params, limit, cursorCreatedAt, cursorId);
    case "changes":
      return queryChanges(db, companyId, params, limit, cursorCreatedAt, cursorId);
    default:
      throw { status: 404, code: "NOT_FOUND", message: `Resource '${resource}' not found.` };
  }
}

// Helper: resolve user_email to user_id within company
async function resolveUserEmail(db: any, companyId: string, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data } = await db
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .ilike("email", normalized)
    .maybeSingle();
  return data?.id || null;
}

// Query tables that join through user_id → users.company_id
async function queryWithCompanyUsers(
  db: any,
  companyId: string,
  table: string,
  params: Record<string, string>,
  limit: number,
  cursorCreatedAt: string | null,
  cursorId: string | null,
  opts: { dateField: string; filters: string[] }
) {
  // Get company user IDs + emails
  const { data: companyUsers } = await db
    .from("users")
    .select("id, email")
    .eq("company_id", companyId);

  if (!companyUsers || companyUsers.length === 0) {
    return { data: [], next_cursor: null };
  }

  const userIds = companyUsers.map((u: any) => u.id);
  const emailById = new Map<string, string>(
    companyUsers.map((u: any) => [u.id, u.email])
  );

  let query = db.from(table).select("*").in("user_id", userIds);

  // User email filter
  if (params.user_email) {
    const userId = await resolveUserEmail(db, companyId, params.user_email);
    if (!userId) {
      throw { status: 404, code: "USER_NOT_FOUND", message: `User '${params.user_email}' not found in company.` };
    }
    query = query.eq("user_id", userId);
  }

  // Date range filters
  if (params.from) query = query.gte(opts.dateField, params.from);
  if (params.to) query = query.lte(opts.dateField, params.to);

  // Additional filters
  for (const f of opts.filters) {
    if (params[f]) query = query.eq(f, params[f]);
  }

  // Composite cursor
  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`
    );
  }

  query = query.order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit);

  const { data, error } = await query;
  if (error) throw mapPgError(error);

  // Inject user_email right after user_id in each row
  const enriched = (data || []).map((row: any) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v;
      if (k === "user_id") {
        out.user_email = emailById.get(row.user_id as string) ?? null;
      }
    }
    return out;
  });

  const nextCursor =
    enriched.length === limit
      ? { created_at: enriched[enriched.length - 1].created_at, id: enriched[enriched.length - 1].id }
      : null;

  return { data: enriched, next_cursor: nextCursor };
}

// Query tables with direct company_id column
async function queryDirectCompany(
  db: any,
  companyId: string,
  table: string,
  params: Record<string, string>,
  limit: number,
  cursorCreatedAt: string | null,
  cursorId: string | null
) {
  let query = db.from(table).select("*").eq("company_id", companyId);

  if (params.active !== undefined) {
    query = query.eq("active", params.active === "true");
  }

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`
    );
  }

  query = query.order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit);

  const { data, error } = await query;
  if (error) throw mapPgError(error);

  const nextCursor =
    data && data.length === limit
      ? { created_at: data[data.length - 1].created_at, id: data[data.length - 1].id }
      : null;

  return { data: data || [], next_cursor: nextCursor };
}

// Query weekly_goals with embedded goals, scoped to company users
async function queryWeeklyGoals(
  db: any,
  companyId: string,
  params: Record<string, string>,
  limit: number,
  cursorCreatedAt: string | null,
  cursorId: string | null
) {
  const { data: companyUsers } = await db
    .from("users")
    .select("id")
    .eq("company_id", companyId);

  if (!companyUsers || companyUsers.length === 0) {
    return { data: [], next_cursor: null };
  }

  const userIds = companyUsers.map((u: any) => u.id);

  let query = db
    .from("weekly_goals")
    .select(
      "id, user_id, week_number, year, is_admin_assigned, template_name, template_id, team_id, rated_at, created_at, updated_at, goals(id, text, category, rating, comment, created_at, updated_at)"
    )
    .in("user_id", userIds);

  if (params.user_email) {
    const userId = await resolveUserEmail(db, companyId, params.user_email);
    if (!userId) {
      throw { status: 404, code: "USER_NOT_FOUND", message: `User '${params.user_email}' not found in company.` };
    }
    query = query.eq("user_id", userId);
  }

  if (params.year) query = query.eq("year", parseInt(params.year));
  if (params.week_number) query = query.eq("week_number", parseInt(params.week_number));
  if (params.is_admin_assigned !== undefined) {
    query = query.eq("is_admin_assigned", params.is_admin_assigned === "true");
  }
  if (params.rated === "true") query = query.not("rated_at", "is", null);
  if (params.rated === "false") query = query.is("rated_at", null);

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`
    );
  }

  query = query.order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit);

  const { data, error } = await query;
  if (error) throw mapPgError(error);

  const nextCursor =
    data && data.length === limit
      ? { created_at: data[data.length - 1].created_at, id: data[data.length - 1].id }
      : null;

  return { data: data || [], next_cursor: nextCursor };
}

// /changes endpoint – queries audit_log
async function queryChanges(
  db: any,
  companyId: string,
  params: Record<string, string>,
  limit: number,
  cursorCreatedAt: string | null,
  cursorId: string | null
) {
  let query = db.from("audit_log").select("*").eq("company_id", companyId);

  if (params.since) {
    query = query.gte("created_at", params.since);
  }
  if (params.table_name) {
    query = query.eq("table_name", params.table_name);
  }
  if (params.action) {
    query = query.eq("action", params.action);
  }

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`
    );
  }

  query = query.order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit);

  const { data, error } = await query;
  if (error) throw mapPgError(error);

  const mapped = (data || []).map((row: any) => ({
    table: row.table_name,
    action: row.action,
    record_id: row.record_id,
    old_data: row.old_data,
    new_data: row.new_data,
    changed_by: row.changed_by,
    changed_at: row.created_at,
  }));

  const nextCursor =
    data && data.length === limit
      ? { created_at: data[data.length - 1].created_at, id: data[data.length - 1].id }
      : null;

  return { data: mapped, next_cursor: nextCursor };
}

// ── POST handler ─────────────────────────────────────────────────────────

async function handlePost(
  db: any,
  companyId: string,
  resource: string,
  body: any
) {
  switch (resource) {
    case "time-entries":
      return postTimeEntry(db, companyId, body);
    case "project-hours":
      return postProjectHours(db, companyId, body);
    default:
      throw { status: 404, code: "NOT_FOUND", message: `POST not supported for '${resource}'.` };
  }
}

async function postTimeEntry(db: any, companyId: string, body: any) {
  const { user_email, start_time, end_time, break_minutes, project_id, external_id } = body;
  if (!user_email || !start_time || !end_time) {
    throw {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "user_email, start_time, and end_time are required.",
    };
  }

  const userId = await resolveUserEmail(db, companyId, user_email);
  if (!userId) {
    throw { status: 404, code: "USER_NOT_FOUND", message: `User '${user_email}' not found in company.` };
  }

  const insertData: any = {
    user_id: userId,
    start_time,
    end_time,
    break_minutes: break_minutes ?? 0,
    status: "approved",
  };
  if (project_id) insertData.project_id = project_id;
  if (external_id) insertData.external_id = external_id;

  const { data, error } = await db.from("time_entries").insert(insertData).select().single();
  if (error) throw { status: 500, code: "INTERNAL_ERROR", message: error.message };

  return { data };
}

async function postProjectHours(db: any, companyId: string, body: any) {
  const { user_email, project_id, hours, date, description, external_id } = body;
  if (!user_email || !project_id || hours === undefined || !date) {
    throw {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "user_email, project_id, hours, and date are required.",
    };
  }

  const userId = await resolveUserEmail(db, companyId, user_email);
  if (!userId) {
    throw { status: 404, code: "USER_NOT_FOUND", message: `User '${user_email}' not found in company.` };
  }

  // Verify project belongs to company
  const { data: proj } = await db
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!proj) {
    throw { status: 404, code: "NOT_FOUND", message: `Project '${project_id}' not found in company.` };
  }

  const insertData: any = {
    user_id: userId,
    project_id,
    hours,
    date,
    status: "approved",
  };
  if (description) insertData.description = description;
  if (external_id) insertData.external_id = external_id;

  const { data, error } = await db.from("project_hours").insert(insertData).select().single();
  if (error) throw { status: 500, code: "INTERNAL_ERROR", message: error.message };

  return { data };
}
