-- Fix Announcements RLS policies for single-tenant operation
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Creators can update their announcements" ON public.announcements;
DROP POLICY IF EXISTS "admins_managers_can_create_announcements" ON public.announcements;
DROP POLICY IF EXISTS "org_members_can_view_announcements" ON public.announcements;

-- Ensure RLS is enabled on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Any authenticated user in the default org can view announcements
CREATE POLICY "org_members_can_view_announcements_v2" 
ON public.announcements 
FOR SELECT 
USING (
  organization_id = get_default_org_id() 
  AND auth.uid() IS NOT NULL
);

-- INSERT policy: Only admin/manager can create announcements
CREATE POLICY "admins_managers_can_create_announcements_v2" 
ON public.announcements 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND organization_id = get_default_org_id()
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- UPDATE policy: Admin/manager or creator can update their announcements
CREATE POLICY "creators_admins_can_update_announcements" 
ON public.announcements 
FOR UPDATE 
USING (
  organization_id = get_default_org_id()
  AND (
    auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  )
);

-- DELETE policy: Only admins/managers can delete announcements
CREATE POLICY "admins_managers_can_delete_announcements" 
ON public.announcements 
FOR DELETE 
USING (
  organization_id = get_default_org_id()
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- Insert demo "Welcome to SkillBridge" announcement idempotently
INSERT INTO public.announcements (
  title,
  content,
  created_by,
  organization_id,
  priority,
  is_pinned
)
SELECT 
  'Welcome to SkillBridge',
  'Welcome to SkillBridge! We''re excited to have you join our learning platform. Start by exploring your available courses and connecting with other learners in our community.',
  u.id,
  get_default_org_id(),
  'high',
  true
FROM public.users u 
WHERE u.role IN ('admin', 'manager') 
AND u.organization_id = get_default_org_id()
AND NOT EXISTS (
  SELECT 1 FROM public.announcements a 
  WHERE a.title = 'Welcome to SkillBridge' 
  AND a.organization_id = get_default_org_id()
)
ORDER BY u.created_at
LIMIT 1;

-- Add helpful comment
COMMENT ON TABLE public.announcements IS 'Organization announcements with single-tenant RLS. All users in org can view, only admin/manager can create/modify.';