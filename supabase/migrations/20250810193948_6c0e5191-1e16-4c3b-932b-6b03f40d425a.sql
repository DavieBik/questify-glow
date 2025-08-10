-- Phase 1: Core Multi-Tenancy Implementation
-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for subdomain like "acme" in acme.skillbridge.com.au
  subscription_plan TEXT DEFAULT 'trial',
  max_users INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#059669', -- emerald-600
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create organization members table (replaces direct user roles)
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker', -- admin, manager, worker
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add organization_id to existing tables
ALTER TABLE public.users ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.courses ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.modules ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.forums ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.groups ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.announcements ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.sessions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Add course visibility and ownership
ALTER TABLE public.courses ADD COLUMN visibility TEXT DEFAULT 'private'; -- private, licensed, public_template
ALTER TABLE public.courses ADD COLUMN owner_type TEXT DEFAULT 'org'; -- org, platform

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if user has role in their org
CREATE OR REPLACE FUNCTION public.has_org_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    JOIN public.users u ON u.id = om.user_id
    WHERE om.user_id = auth.uid() 
    AND u.organization_id = om.organization_id
    AND om.role = required_role
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if user is admin or manager in their org
CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    JOIN public.users u ON u.id = om.user_id
    WHERE om.user_id = auth.uid() 
    AND u.organization_id = om.organization_id
    AND om.role IN ('admin', 'manager')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization" ON public.organizations
FOR SELECT USING (id = public.get_user_org_id());

CREATE POLICY "Org admins can update their organization" ON public.organizations
FOR UPDATE USING (id = public.get_user_org_id() AND public.has_org_role('admin'));

-- RLS Policies for org_members
CREATE POLICY "Users can view members of their organization" ON public.org_members
FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can manage members" ON public.org_members
FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin_or_manager());

-- Update existing RLS policies to include organization isolation

-- Users table policies (update existing)
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT USING (
  (auth.uid() = id) OR 
  (organization_id = public.get_user_org_id()) OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE USING (
  (auth.uid() = id) OR 
  (organization_id = public.get_user_org_id() AND public.is_org_admin_or_manager())
);

-- Courses table policies (update existing)
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
CREATE POLICY "courses_select_policy" ON public.courses
FOR SELECT USING (
  is_active AND (
    organization_id IS NULL OR -- Platform courses
    organization_id = public.get_user_org_id() OR -- Org courses
    visibility IN ('licensed', 'public_template') -- Shared courses
  )
);

DROP POLICY IF EXISTS "courses_manage_policy" ON public.courses;
CREATE POLICY "courses_manage_policy" ON public.courses
FOR ALL USING (
  (organization_id = public.get_user_org_id() AND public.is_org_admin_or_manager()) OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'::user_role))
);

-- Modules table policies
DROP POLICY IF EXISTS "Admins and managers can manage modules" ON public.modules;
CREATE POLICY "org_modules_manage_policy" ON public.modules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = modules.course_id 
    AND (
      (c.organization_id = public.get_user_org_id() AND public.is_org_admin_or_manager()) OR
      (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'::user_role))
    )
  )
);

-- User course enrollments policies
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.user_course_enrollments;
CREATE POLICY "org_enrollments_select_policy" ON public.user_course_enrollments
FOR SELECT USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = user_id 
    AND u.organization_id = public.get_user_org_id() 
    AND public.is_org_admin_or_manager()
  ))
);

-- Completions policies  
DROP POLICY IF EXISTS "Users can view their own completions" ON public.completions;
CREATE POLICY "org_completions_select_policy" ON public.completions
FOR SELECT USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = user_id 
    AND u.organization_id = public.get_user_org_id() 
    AND public.is_org_admin_or_manager()
  ))
);

-- Forums, groups, announcements, sessions policies - scope to organization
CREATE POLICY "org_forums_policy" ON public.forums
FOR ALL USING (
  organization_id = public.get_user_org_id() OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

CREATE POLICY "org_groups_policy" ON public.groups  
FOR ALL USING (
  organization_id = public.get_user_org_id() OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

CREATE POLICY "org_announcements_policy" ON public.announcements
FOR ALL USING (
  organization_id = public.get_user_org_id() OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

CREATE POLICY "org_sessions_policy" ON public.sessions
FOR ALL USING (
  organization_id = public.get_user_org_id() OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

CREATE POLICY "org_projects_policy" ON public.projects
FOR ALL USING (
  organization_id = public.get_user_org_id() OR
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

-- Create indexes for performance
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_courses_organization_id ON public.courses(organization_id);
CREATE INDEX idx_org_members_organization_id ON public.org_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);

-- Update timestamp trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();