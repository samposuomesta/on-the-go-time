CREATE OR REPLACE FUNCTION public.prevent_identity_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow first-time linking (OLD.auth_user_id IS NULL) by the auth-insert trigger
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF OLD.auth_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'auth_user_id cannot be modified';
    END IF;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email cannot be modified through the API';
  END IF;

  RETURN NEW;
END;
$function$;