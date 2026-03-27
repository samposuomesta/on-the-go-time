

## Plan: Clarify JWT key generation workflow in Installation101.md

**Problem:** The docs are unclear about whether `generate-keys.sh` writes directly to `.env` or just prints keys to stdout. Users don't know upfront which keys are needed and where they go.

**Changes to `docs/Installation101.md` (lines 491-556):**

1. **Add a "Keys needed" summary before the options** listing exactly which `.env` variables the JWT generation step produces:
   - `ANON_KEY` — paste into `.env` at the `ANON_KEY=` line
   - `SERVICE_ROLE_KEY` — paste into `.env` at the `SERVICE_ROLE_KEY=` line
   - Both are derived from `JWT_SECRET` (which must already be set in `.env`)

2. **Clarify each option's behavior:**
   - **Option A (`generate-keys.sh`):** State clearly whether it **writes directly to `.env`** (auto-updates the file) or **prints to stdout** (requires manual copy). Add a note: "This script writes keys directly to `.env`. It will overwrite existing `ANON_KEY` and `SERVICE_ROLE_KEY` values. Other `.env` values (like `POSTGRES_PASSWORD`) are not modified."
   - **Option B (`npx`):** "Prints keys to stdout. Copy the output values into `.env` manually."
   - **Option C (Node.js script):** "Prints keys to stdout in `KEY=value` format. Copy both lines into `.env`."
   - **Option D (jwt.io):** "Manual browser-based generation. Copy resulting tokens into `.env`."

3. **Remove the backup/diff workflow** from the previous iteration — replace with the simple, direct guidance above.

