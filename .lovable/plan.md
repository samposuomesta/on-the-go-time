
Goal: update the self-hosting guidance so this error is handled correctly without telling users to run a command that PostgreSQL rejects.

What I found
- The current docs already explain that `.env` password mismatches can break startup, especially analytics.
- Earlier guidance suggested `ALTER USER supabase_admin ...`, but your error confirms that is not a valid recovery path in this environment.
- The install guide currently has:
  - secret generation and `generate-keys.sh` instructions
  - startup checks and generic troubleshooting
  - no dedicated “changed POSTGRES_PASSWORD after first boot” recovery section

Recommended implementation
1. Remove the bad recovery advice
- Replace any instruction that tells users to modify `supabase_admin` directly.
- Avoid telling users to change reserved roles manually.

2. Add a clear warning where passwords are generated
- In the secret generation / `.env` section, add a short note:
  - `POSTGRES_PASSWORD` is only applied on first database initialization.
  - Changing it later in `.env` does not update the existing database volume.
  - If changed afterwards, services like analytics may fail with `invalid_password` / `supabase_admin`.

3. Add the safe recovery path in troubleshooting
- Add a dedicated subsection under troubleshooting for:
  - `password authentication failed for user "supabase_admin"`
  - `"supabase_admin" is a reserved role, only superusers can modify it`
- Document two supported recovery options:
  - Option A: revert `.env` `POSTGRES_PASSWORD` to the original value used when the DB volume was first created, then restart containers
  - Option B: if the user intentionally wants a new DB password, use the official self-hosted password rotation script from the Docker bundle (instead of raw `ALTER ROLE` commands), then restart

4. Add exact verification steps
- After recovery, check:
  - `docker compose ps`
  - `docker compose logs supabase-analytics --tail=50`
- Expected result: analytics becomes healthy and no longer reports `invalid_password`.

Proposed doc changes
- `docs/Installation101.md`
  - near secret generation / `generate-keys.sh`: add the persistence warning
  - in troubleshooting: add a new row or subsection for this specific failure
  - optionally add a short “Password changes after first boot” note in the startup section

Suggested wording to add
```text
Important: changing POSTGRES_PASSWORD in .env after the database has already been initialized does not change the password inside the existing database volume. This can cause services such as analytics to fail with “password authentication failed for user supabase_admin”.

Do not try to fix this by running ALTER USER supabase_admin ... manually. In this environment that role is reserved and direct modification may be blocked.

Recovery:
1. Restore POSTGRES_PASSWORD in .env to the original value used on first startup, then run:
   docker compose down
   docker compose up -d

If you intentionally need to rotate the database password, use the official password rotation script provided in the self-hosted Docker bundle, then restart the stack.
```

Technical notes
- This is a documentation-only fix.
- No app code or backend schema changes are needed.
- The plan aligns with the current self-hosted architecture already documented in `docs/Installation101.md`.

Open point
- If you want, I can next turn this into a precise doc-edit plan with the exact sections/line ranges to update in `Installation101.md`.
