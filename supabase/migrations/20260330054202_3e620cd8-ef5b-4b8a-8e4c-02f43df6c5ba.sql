
-- 1. Make receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- 2. Drop existing permissive public policies
DROP POLICY IF EXISTS "Allow insert receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read receipts" ON storage.objects;

-- 3. Create auth-scoped storage policies using user folder pattern
CREATE POLICY "auth_read_receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth_user_id()::text);

CREATE POLICY "auth_insert_receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth_user_id()::text);

CREATE POLICY "auth_update_receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth_user_id()::text)
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth_user_id()::text);

CREATE POLICY "auth_delete_receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth_user_id()::text);

-- 4. Allow admins/managers to read receipts of same-company users
CREATE POLICY "admin_manager_read_receipts" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND auth_user_role() IN ('admin', 'manager')
    AND is_same_company_user((storage.foldername(name))[1]::uuid)
  );

-- 5. Enable RLS on api_rate_limits (deny-all for non-service-role)
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- 6. Enable RLS on idempotency_keys (deny-all for non-service-role)
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 7. Fix manager role escalation - drop and recreate users UPDATE policy
DROP POLICY IF EXISTS "Users can update own or managed" ON users;

CREATE POLICY "Users can update own or managed" ON users
  FOR UPDATE TO authenticated
  USING (
    company_id = auth_user_company_id()
    AND (
      auth_user_role() = 'admin'
      OR id = auth_user_id()
      OR (
        auth_user_role() = 'manager'
        AND id IN (SELECT um.user_id FROM user_managers um WHERE um.manager_id = auth_user_id())
      )
    )
  )
  WITH CHECK (
    company_id = auth_user_company_id()
    AND (
      -- Admins can update anything
      auth_user_role() = 'admin'
      -- Self-update: cannot change own role
      OR (
        id = auth_user_id()
        AND role = (SELECT u.role FROM users u WHERE u.id = auth_user_id())
      )
      -- Manager update: cannot change role
      OR (
        auth_user_role() = 'manager'
        AND id IN (SELECT um.user_id FROM user_managers um WHERE um.manager_id = auth_user_id())
        AND role = (SELECT u.role FROM users u WHERE u.id = users.id)
      )
    )
  );
