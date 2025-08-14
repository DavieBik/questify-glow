-- First check and drop ALL existing conflicting policies, then recreate them
-- This ensures we have a clean slate for the single-tenant org setup

-- 1. Clean up and recreate Announcements policies
DROP POLICY IF EXISTS "org_members_can_view_announcements" ON public.announcements;
DROP POLICY IF EXISTS "admins_managers_can_create_announcements" ON public.announcements;
DROP POLICY IF EXISTS "org_users_can_view_their_conversations" ON public.conversations;
DROP POLICY IF EXISTS "org_users_can_view_conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "org_users_can_view_their_messages" ON public.messages;
DROP POLICY IF EXISTS "org_members_can_view_project_teams" ON public.project_teams;
DROP POLICY IF EXISTS "org_members_can_view_projects" ON public.projects;
DROP POLICY IF EXISTS "org_members_can_create_projects" ON public.projects;
DROP POLICY IF EXISTS "org_users_can_view_team_memberships" ON public.team_members;
DROP POLICY IF EXISTS "org_users_can_join_teams" ON public.team_members;

-- Now check what announcements policies currently exist
-- and clean them up for single-tenant org access
DROP POLICY IF EXISTS "Users can view announcements for enrolled courses" ON public.announcements;
DROP POLICY IF EXISTS "org_announcements_policy" ON public.announcements;

-- Create simple org-wide announcement access
CREATE POLICY "org_members_can_view_announcements" 
ON public.announcements 
FOR SELECT 
USING (
  organization_id = get_default_org_id()
);

-- Update insert policy for admins/managers
DROP POLICY IF EXISTS "Admins and managers can create announcements" ON public.announcements;

CREATE POLICY "admins_managers_can_create_announcements"
ON public.announcements
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

-- 2. Update Conversations for org access
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "org_users_can_view_their_conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  )
);

-- 3. Update Messages for org access  
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "org_users_can_view_their_messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id 
    AND cp.user_id = auth.uid()
  )
);

-- 4. Update Project Teams for org access
DROP POLICY IF EXISTS "Users can view teams in accessible projects" ON public.project_teams;

CREATE POLICY "org_members_can_view_project_teams"
ON public.project_teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_teams.project_id
    AND p.organization_id = get_default_org_id()
  )
);

-- 5. Update Projects for org access
DROP POLICY IF EXISTS "Users can view projects in enrolled courses" ON public.projects;
DROP POLICY IF EXISTS "org_projects_policy" ON public.projects;

CREATE POLICY "org_members_can_view_projects"
ON public.projects
FOR SELECT
USING (
  organization_id = get_default_org_id()
);

-- 6. Add team member policies
CREATE POLICY "users_can_view_team_memberships" 
ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.project_teams pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = team_members.team_id
    AND p.organization_id = get_default_org_id()
  )
);