-- Fix courses created_by constraint and add Phase 3 features

-- Make created_by nullable temporarily for seeding
ALTER TABLE public.courses ALTER COLUMN created_by DROP NOT NULL;

-- Add course visibility and content management features
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS visibility_type text DEFAULT 'private' CHECK (visibility_type IN ('private', 'licensed', 'public'));

-- Add content import tracking
CREATE TABLE IF NOT EXISTS public.content_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  import_type text NOT NULL CHECK (import_type IN ('upload', 'scorm', 'clone')),
  source_course_id UUID REFERENCES public.courses(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url text,
  metadata jsonb DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage imports" ON public.content_imports
FOR ALL USING (
  organization_id = get_user_org_id() AND is_org_admin_or_manager()
);

-- Add billing subscriptions table
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_name text NOT NULL DEFAULT 'trial',
  max_users integer NOT NULL DEFAULT 5,
  price_aud_cents integer,
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status text DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view their subscription" ON public.organization_subscriptions
FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Org admins can update their subscription" ON public.organization_subscriptions  
FOR UPDATE USING (organization_id = get_user_org_id() AND has_org_role('admin'));

-- Create demo organizations
INSERT INTO public.organizations (name, slug, contact_email, subscription_plan, max_users, primary_color) VALUES
('Acme Support', 'acme-support', 'admin@acmesupport.com.au', 'professional', 25, '#2563eb'),
('DiamondCare', 'diamondcare', 'admin@diamondcare.com.au', 'enterprise', 50, '#7c3aed')
ON CONFLICT (slug) DO NOTHING;

-- Create demo courses
INSERT INTO public.courses (
  title, description, short_description, category, difficulty, 
  estimated_duration_minutes, is_mandatory, is_active, 
  visibility_type, owner_type, organization_id
) VALUES
-- Acme Private Courses
('Introduction to Person-Centred Disability Support', 
 'Comprehensive training on person-centred approaches in disability support services, focusing on individual needs, preferences, and empowerment.',
 'Learn person-centred disability support fundamentals', 'Disability Support', 'beginner', 120, true, true,
 'private', 'org', (SELECT id FROM public.organizations WHERE slug = 'acme-support')),

('Acme Workplace Health & Safety for Disability Support',
 'Essential workplace health and safety protocols specific to disability support environments, including hazard identification and incident management.',
 'Workplace safety in disability support settings', 'Health & Safety', 'intermediate', 90, true, true,
 'private', 'org', (SELECT id FROM public.organizations WHERE slug = 'acme-support')),

-- DiamondCare Private Courses  
('DiamondCare Client Engagement Best Practices',
 'Advanced strategies for effective client engagement, relationship building, and professional communication in care settings.',
 'Master client engagement and professional communication', 'Client Relations', 'intermediate', 105, true, true,
 'private', 'org', (SELECT id FROM public.organizations WHERE slug = 'diamondcare')),

('DiamondCare Emergency Procedures',
 'Comprehensive emergency response procedures including evacuation protocols, medical emergencies, and incident reporting systems.',
 'Emergency response and safety procedures', 'Emergency Management', 'advanced', 75, true, true,
 'private', 'org', (SELECT id FROM public.organizations WHERE slug = 'diamondcare')),

-- Licensed Course (available to both orgs)
('Mandatory Reporting Requirements in Disability Services',
 'Essential training on legal obligations for mandatory reporting in disability services, including recognition of abuse, neglect, and proper reporting procedures.',
 'Legal requirements for mandatory reporting', 'Compliance', 'intermediate', 80, true, true,
 'licensed', 'vendor', NULL),

-- Public Courses (available to all orgs)
('Effective Communication in Care Settings',
 'Fundamental communication skills for healthcare and support workers, including active listening, empathy, and professional boundaries.',
 'Essential communication skills for care workers', 'Communication', 'beginner', 60, false, true,
 'public', 'vendor', NULL),

('Infection Prevention & Control',
 'Comprehensive infection control protocols including hand hygiene, PPE usage, and environmental cleaning in care settings.',
 'Essential infection prevention measures', 'Health & Safety', 'beginner', 70, true, true,
 'public', 'vendor', NULL),

('Working with Diverse Clients',
 'Cultural competency and inclusive practices for working with clients from diverse backgrounds, including CALD communities and LGBTI+ individuals.',
 'Cultural competency and inclusive care practices', 'Diversity & Inclusion', 'intermediate', 85, false, true,
 'public', 'vendor', NULL);

-- Update course visibility policies
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
CREATE POLICY "courses_select_policy" ON public.courses
FOR SELECT USING (
  is_active AND (
    visibility_type = 'public' OR
    (visibility_type = 'private' AND organization_id = get_user_org_id()) OR
    (visibility_type = 'licensed' AND organization_id IS NULL)
  )
);

-- Add subscription data for demo orgs
INSERT INTO public.organization_subscriptions (organization_id, plan_name, max_users, price_aud_cents, status) VALUES
((SELECT id FROM public.organizations WHERE slug = 'acme-support'), 'professional', 25, 4900, 'active'),
((SELECT id FROM public.organizations WHERE slug = 'diamondcare'), 'enterprise', 50, 9900, 'active')
ON CONFLICT (organization_id) DO NOTHING;