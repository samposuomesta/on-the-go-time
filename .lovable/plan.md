## Context

Lockfiles themselves don't have versions — they record what's installed. The actual fix is to upgrade the **lodash** package to `4.18.1` (the patched release for GHSA-35jh-r3h4-6jhm / follow-up to CVE-2021-23337).

### Where lodash comes from in this project

`lodash` is **not** a direct dependency in `package.json`. It is pulled in transitively at version `4.17.21` by:

- `recharts@2.15.4` → `lodash ^4.17.21` (used for chart rendering across the app)

Several `lodash.*` micro-packages (`lodash.merge`, `lodash.isequal`, etc.) are also present via `@fast-csv/*`, `@tailwindcss/typography`, `archiver-utils`, and `eslint`. **These are separate packages and are not affected** by the lodash main-package advisory — no action needed on them.

## Will this affect functionality?

Low risk, but not zero:

- **Recharts** is the only runtime consumer. It uses lodash utilities like `get`, `isEqual`, `throttle`, etc. Lodash 4.x has maintained a strict no-breaking-change policy across minor versions, so `4.17.21 → 4.18.1` should be drop-in compatible.
- **Build tooling** (`eslint`, tailwind typography) only uses isolated `lodash.*` packages, which are unaffected.
- **Edge functions** (Deno) do not use npm lodash.
- No application code in `src/` imports lodash directly.

Recommended verification after the bump: load the pages that render charts (`MyStatistics`, `AdminDashboard`, weekly-goals dashboards) and confirm charts render correctly.

## Plan

1. **Add an npm/bun override** in `package.json` to force `lodash` to `4.18.1` everywhere in the dependency tree:
   ```json
   "overrides": {
     "lodash": "4.18.1"
   },
   "resolutions": {
     "lodash": "4.18.1"
   }
   ```
   (`overrides` for npm, `resolutions` for bun/yarn compatibility.)

2. **Reinstall** so lockfiles regenerate with the new version:
   - `bun install` updates `bun.lock` (and `bun.lockb` if present).
   - `npm install` updates `package-lock.json`.
   The Lovable sandbox will regenerate these automatically.

3. **Verify** in the preview:
   - Open the dashboard pages that show charts.
   - Check console for any lodash-related runtime errors.

4. **Self-hosted servers** — after pulling the change, run from `/opt/timetrack/app`:
   ```bash
   bun install
   bun run build
   ```
   Then redeploy the static frontend per your normal maintenance workflow.

## Caveat

At the time of writing, the latest published lodash on npm is `4.17.21`. If `4.18.1` has not yet been published when the install runs, `bun install` will fail with "version not found." If that happens, options are:
- Wait until the patched version is available on npm, **or**
- Pin to a forked/patched build, **or**
- Apply a `patches/` patch via `patch-package` until upstream releases.

I'll surface that error and pause for your decision if it occurs.
