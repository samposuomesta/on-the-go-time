/**
 * Sanitizes error messages from Supabase/Postgres responses to prevent
 * leaking database structure (table names, constraint names, column names)
 * into UI toasts and console output.
 *
 * Auth errors and known-safe messages pass through unchanged so the user
 * still sees actionable feedback like "Invalid login credentials".
 */

const GENERIC_MESSAGE = "Operation failed. Please try again.";
const GENERIC_MESSAGE_FI = "Toiminto epäonnistui. Yritä uudelleen.";

// Patterns that indicate a Postgres/PostgREST error leaking schema details.
const LEAKY_PATTERNS: RegExp[] = [
  /relation ".+" does not exist/i,
  /column ".+" (of relation|does not exist)/i,
  /violates (unique|foreign key|check|not-null) constraint ".+"/i,
  /duplicate key value violates/i,
  /permission denied for (table|relation|schema|function|sequence) /i,
  /new row violates row-level security/i,
  /insert or update on table ".+" violates/i,
  /update or delete on table ".+" violates/i,
  /null value in column ".+"/i,
  /invalid input syntax for type/i,
  /could not find the .+ in the schema cache/i,
  /pg(rst)?[0-9]+/i,
];

function isLikelyAuthError(msg: string, code?: unknown): boolean {
  if (typeof code === "string" && code.startsWith("auth/")) return true;
  return (
    msg.includes("Invalid login credentials") ||
    msg.includes("Email not confirmed") ||
    msg.includes("User already registered") ||
    msg.includes("Password should be") ||
    msg.includes("Email rate limit") ||
    msg.includes("rate limit")
  );
}

export interface SanitizeOptions {
  /** Use Finnish generic message. Defaults to English. */
  finnish?: boolean;
  /** Override the generic fallback message. */
  fallback?: string;
}

/**
 * Returns a safe Error object. Leaky DB errors are replaced with a generic
 * message; auth errors and short safe messages are preserved.
 */
export function sanitizeError(err: unknown, opts: SanitizeOptions = {}): Error {
  const generic = opts.fallback ?? (opts.finnish ? GENERIC_MESSAGE_FI : GENERIC_MESSAGE);
  const raw = (err as { message?: unknown })?.message;
  const msg = typeof raw === "string" ? raw : String(err ?? "");
  const code = (err as { code?: unknown })?.code;

  if (!msg) return new Error(generic);
  if (isLikelyAuthError(msg, code)) return new Error(msg);
  if (LEAKY_PATTERNS.some((p) => p.test(msg))) return new Error(generic);

  return new Error(msg);
}

/** Convenience: get just the sanitized message string. */
export function sanitizeErrorMessage(err: unknown, opts: SanitizeOptions = {}): string {
  return sanitizeError(err, opts).message;
}
