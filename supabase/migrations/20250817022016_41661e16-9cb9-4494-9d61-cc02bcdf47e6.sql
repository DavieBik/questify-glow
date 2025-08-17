-- Force drop all existing SCORM RLS policies
DROP POLICY IF EXISTS "Managers and admins can manage SCORM packages" ON public.scorm_packages;
DROP POLICY IF EXISTS "Org members can view SCORM packages" ON public.scorm_packages;
DROP POLICY IF EXISTS "Users can manage their own SCORM sessions" ON public.scorm_sessions;
DROP POLICY IF EXISTS "Managers and admins can view all org SCORM sessions" ON public.scorm_sessions;
DROP POLICY IF EXISTS "Users can manage interactions for their sessions" ON public.scorm_interactions;
DROP POLICY IF EXISTS "Managers and admins can view all org SCORM interactions" ON public.scorm_interactions;

-- Create fresh SCORM package policies aligned with app roles and single-tenant helper
CREATE POLICY "Managers and admins can manage SCORM packages"
ON public.scorm_packages
FOR ALL
TO authenticated
USING (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
)
WITH CHECK (
  organization_id = get_default_org_id() 
  AND auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

CREATE POLICY "Org members can view SCORM packages"
ON public.scorm_packages
FOR SELECT
TO authenticated
USING (
  organization_id = get_default_org_id() 
  AND auth.uid() IS NOT NULL
);

-- Create SCORM session policies - learners see own, managers/admins see all
CREATE POLICY "Users can manage their own SCORM sessions"
ON public.scorm_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all org SCORM sessions"
ON public.scorm_sessions
FOR SELECT
TO authenticated
USING (
  organization_id = get_default_org_id()
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- Create SCORM interaction policies - learners see own, managers/admins see all
CREATE POLICY "Users can manage interactions for their sessions"
ON public.scorm_interactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scorm_sessions ss 
    WHERE ss.id = scorm_interactions.session_id 
    AND ss.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scorm_sessions ss 
    WHERE ss.id = scorm_interactions.session_id 
    AND ss.user_id = auth.uid()
  )
);

CREATE POLICY "Managers and admins can view all org SCORM interactions"
ON public.scorm_interactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scorm_sessions ss 
    WHERE ss.id = scorm_interactions.session_id 
    AND ss.organization_id = get_default_org_id()
  )
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);