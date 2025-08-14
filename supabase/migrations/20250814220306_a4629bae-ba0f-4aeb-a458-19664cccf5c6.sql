-- Unblock RLS for Announcements, Messages, and Group Projects in single-tenant setup
-- This will allow org users to access their data properly

-- 1. Update Announcements policies to work with single-tenant setup
-- The existing policies are too restrictive for org-wide announcements

-- Drop existing restrictive policies and create org-wide ones
DROP POLICY IF EXISTS "Users can view announcements for enrolled courses" ON public.announcements;
DROP POLICY IF EXISTS "org_announcements_policy" ON public.announcements;

-- Create new org-wide announcement policies
CREATE POLICY "org_members_can_view_announcements" 
ON public.announcements 
FOR SELECT 
USING (
  organization_id = get_default_org_id()
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = get_default_org_id()
  )
);

-- Keep existing admin/manager insert policy but simplify the check
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
    AND u.organization_id = get_default_org_id()
  )
);

-- 2. Update Conversations and Messages for org-wide access
-- Current policies are good, but let's ensure they work with organization boundaries

-- Update conversations policy to include org check
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "org_users_can_view_their_conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    JOIN public.users u ON u.id = cp.user_id
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
    AND u.organization_id = get_default_org_id()
  )
);

-- Update conversation participants policy 
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "org_users_can_view_conversation_participants"
ON public.conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    JOIN public.users u ON u.id = cp2.user_id
    WHERE cp2.conversation_id = conversation_participants.conversation_id 
    AND cp2.user_id = auth.uid()
    AND u.organization_id = get_default_org_id()
  )
);

-- Update messages policy
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "org_users_can_view_their_messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    JOIN public.users u ON u.id = cp.user_id
    WHERE cp.conversation_id = messages.conversation_id 
    AND cp.user_id = auth.uid()
    AND u.organization_id = get_default_org_id()
  )
);

-- 3. Update Group Projects (using existing projects/project_teams structure)
-- Make projects accessible to org members

DROP POLICY IF EXISTS "Users can view teams in accessible projects" ON public.project_teams;

CREATE POLICY "org_members_can_view_project_teams"
ON public.project_teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.users u ON u.id = auth.uid()
    WHERE p.id = project_teams.project_id
    AND p.organization_id = get_default_org_id()
    AND u.organization_id = get_default_org_id()
  )
);

-- Allow org members to view projects
DROP POLICY IF EXISTS "Users can view projects in enrolled courses" ON public.projects;
DROP POLICY IF EXISTS "org_projects_policy" ON public.projects;

CREATE POLICY "org_members_can_view_projects"
ON public.projects
FOR SELECT
USING (
  organization_id = get_default_org_id()
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.organization_id = get_default_org_id()
  )
);

-- Allow org members to create projects
CREATE POLICY "org_members_can_create_projects"
ON public.projects
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.organization_id = get_default_org_id()
  )
);

-- Add policy for team members table
-- First check what policies exist
-- Add team member policies for org access
CREATE POLICY "org_users_can_view_team_memberships" 
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_teams pt
    JOIN public.projects p ON p.id = pt.project_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE pt.id = team_members.team_id
    AND p.organization_id = get_default_org_id()
    AND u.organization_id = get_default_org_id()
  )
);

CREATE POLICY "org_users_can_join_teams"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.project_teams pt
    JOIN public.projects p ON p.id = pt.project_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE pt.id = team_members.team_id
    AND p.organization_id = get_default_org_id()
    AND u.organization_id = get_default_org_id()
  )
);