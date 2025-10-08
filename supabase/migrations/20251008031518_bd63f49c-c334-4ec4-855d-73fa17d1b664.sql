-- Fix critical security vulnerabilities: Block unauthenticated access to sensitive tables
-- This migration handles existing policies gracefully

-- 1. Fix users table - Block unauthenticated access and allow admins/managers to view org members
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "users_read_own" ON public.users;
  DROP POLICY IF EXISTS "users_require_auth_select" ON public.users;
  DROP POLICY IF EXISTS "admins_managers_view_org_users" ON public.users;
END $$;

-- Create new policies with proper authentication checks
CREATE POLICY "users_require_auth_select" 
ON public.users
FOR SELECT 
USING (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY "admins_managers_view_org_users"
ON public.users
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = users.organization_id
  )
);

-- 2. Fix certificates table - Require authentication
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
  DROP POLICY IF EXISTS "certificates_require_auth_select" ON public.certificates;
END $$;

CREATE POLICY "certificates_require_auth_select"
ON public.certificates
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Fix organization_subscriptions - Require authentication
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Org admins can view their subscription" ON public.organization_subscriptions;
  DROP POLICY IF EXISTS "org_subscriptions_require_auth_select" ON public.organization_subscriptions;
END $$;

CREATE POLICY "org_subscriptions_require_auth_select"
ON public.organization_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = get_user_org_id()
);

-- 4. Fix profiles table - Ensure proper access control
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_require_auth_select" ON public.profiles;
END $$;

CREATE POLICY "profiles_require_auth_select"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- 5. Fix app_settings - Require authentication for system config
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
  DROP POLICY IF EXISTS "app_settings_require_auth_select" ON public.app_settings;
END $$;

CREATE POLICY "app_settings_require_auth_select"
ON public.app_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);