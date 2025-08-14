-- Add seed data for announcements, conversations, and group projects
-- All data will be assigned to the default organization

-- 1. Insert demo announcement
INSERT INTO public.announcements (
  id,
  title,
  content,
  created_by,
  organization_id,
  priority,
  is_pinned
)
SELECT 
  'demo-announcement-001'::uuid,
  'Welcome to SkillBridge',
  'Welcome to SkillBridge! We''re excited to have you join our learning platform. Start by exploring your available courses and connecting with other learners.',
  u.id,
  get_default_org_id(),
  'high',
  true
FROM public.users u 
WHERE u.role IN ('admin', 'manager') 
AND u.organization_id = get_default_org_id()
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 2. Create demo conversation and message
-- First, create a conversation
INSERT INTO public.conversations (
  id,
  title,
  type,
  created_by
)
SELECT 
  'demo-conversation-001'::uuid,
  'General Discussion',
  'group',
  u.id
FROM public.users u 
WHERE u.organization_id = get_default_org_id()
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Add the creator as a participant
INSERT INTO public.conversation_participants (
  id,
  conversation_id,
  user_id
)
SELECT 
  'demo-participant-001'::uuid,
  'demo-conversation-001'::uuid,
  u.id
FROM public.users u 
WHERE u.organization_id = get_default_org_id()
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Add a welcome message
INSERT INTO public.messages (
  id,
  conversation_id,
  sender_id,
  content,
  message_type
)
SELECT 
  'demo-message-001'::uuid,
  'demo-conversation-001'::uuid,
  u.id,
  'Hello 👋 Welcome to our discussion space!',
  'text'
FROM public.users u 
WHERE u.organization_id = get_default_org_id()
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 3. Create demo group project
-- Insert demo project
INSERT INTO public.projects (
  id,
  title,
  description,
  instructions,
  created_by,
  organization_id,
  is_active,
  allow_self_enrollment,
  min_team_size,
  max_team_size
)
SELECT 
  'demo-project-001'::uuid,
  'Onboarding Project',
  'A collaborative project to help new team members get familiar with our platform and processes.',
  'Work together to explore the platform features and create a presentation about your learning experience.',
  u.id,
  get_default_org_id(),
  true,
  true,
  1,
  5
FROM public.users u 
WHERE u.organization_id = get_default_org_id()
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Create a demo team for the project
INSERT INTO public.project_teams (
  id,
  project_id,
  name,
  description,
  created_by,
  is_full
)
SELECT 
  'demo-team-001'::uuid,
  'demo-project-001'::uuid,
  'Onboarding Team Alpha',
  'First onboarding team - let''s learn together!',
  u.id,
  false
FROM public.users u 
WHERE u.organization_id = get_default_org_id()
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Add the creator as a team member
INSERT INTO public.team_members (
  id,
  team_id,
  user_id
)
SELECT 
  'demo-member-001'::uuid,
  'demo-team-001'::uuid,
  u.id
FROM public.users u 
WHERE u.organization_id = get_default_org_id()
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Note: There's no team messages table in the current schema
-- The project communication likely happens through the main conversations/messages system

-- Add a comment about the seeded data
COMMENT ON TABLE public.announcements IS 'Contains organization announcements. Demo data: Welcome announcement for default org.';
COMMENT ON TABLE public.conversations IS 'Contains user conversations. Demo data: General discussion with welcome message.';
COMMENT ON TABLE public.projects IS 'Contains group projects. Demo data: Onboarding project with demo team.';

-- Success message
SELECT 
  'Demo data seeded successfully' as status,
  get_default_org_id() as organization_id,
  (SELECT COUNT(*) FROM public.announcements WHERE organization_id = get_default_org_id()) as announcements_count,
  (SELECT COUNT(*) FROM public.conversations) as conversations_count,
  (SELECT COUNT(*) FROM public.projects WHERE organization_id = get_default_org_id()) as projects_count;