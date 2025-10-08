-- Fix critical security vulnerabilities: Block unauthenticated access to sensitive tables

-- 1. Fix users table - Block unauthenticated access and allow admins/managers to view org members
-- Drop the overly permissive policy first
DROP POLICY IF EXISTS "users_read_own" ON public.users;

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
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;

CREATE POLICY "certificates_require_auth_select"
ON public.certificates
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Fix organization_subscriptions - Require authentication
DROP POLICY IF EXISTS "Org admins can view their subscription" ON public.organization_subscriptions;

CREATE POLICY "org_subscriptions_require_auth_select"
ON public.organization_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = get_user_org_id()
);

-- 4. Fix profiles table - Ensure proper access control
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

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
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "app_settings_require_auth_select"
ON public.app_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);