-- Add seed data for announcements, conversations, and group projects with proper UUIDs
-- All data will be assigned to the default organization

-- 1. Insert demo announcement
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
  'Welcome to SkillBridge! We''re excited to have you join our learning platform. Start by exploring your available courses and connecting with other learners.',
  u.id,
  get_default_org_id(),
  'high',
  true
FROM public.users u 
WHERE u.role IN ('admin', 'manager') 
AND u.organization_id = get_default_org_id()
LIMIT 1
ON CONFLICT DO NOTHING;

-- 2. Create demo conversation and message
-- First, create a conversation with a generated UUID
WITH demo_conversation AS (
  INSERT INTO public.conversations (
    title,
    type,
    created_by
  )
  SELECT 
    'General Discussion',
    'group',
    u.id
  FROM public.users u 
  WHERE u.organization_id = get_default_org_id()
  ORDER BY u.created_at
  LIMIT 1
  ON CONFLICT DO NOTHING
  RETURNING id, created_by
),
demo_participant AS (
  INSERT INTO public.conversation_participants (
    conversation_id,
    user_id
  )
  SELECT 
    dc.id,
    dc.created_by
  FROM demo_conversation dc
  ON CONFLICT DO NOTHING
  RETURNING conversation_id, user_id
)
INSERT INTO public.messages (
  conversation_id,
  sender_id,
  content,
  message_type
)
SELECT 
  dp.conversation_id,
  dp.user_id,
  'Hello 👋 Welcome to our discussion space!',
  'text'
FROM demo_participant dp
ON CONFLICT DO NOTHING;

-- 3. Create demo group project
-- Insert demo project and team in sequence
WITH demo_project AS (
  INSERT INTO public.projects (
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
  ON CONFLICT DO NOTHING
  RETURNING id, created_by
),
demo_team AS (
  INSERT INTO public.project_teams (
    project_id,
    name,
    description,
    created_by,
    is_full
  )
  SELECT 
    dp.id,
    'Onboarding Team Alpha',
    'First onboarding team - let''s learn together!',
    dp.created_by,
    false
  FROM demo_project dp
  ON CONFLICT DO NOTHING
  RETURNING id, created_by
)
INSERT INTO public.team_members (
  team_id,
  user_id
)
SELECT 
  dt.id,
  dt.created_by
FROM demo_team dt
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE public.announcements IS 'Contains organization announcements. Demo data: Welcome announcement for default org.';
COMMENT ON TABLE public.conversations IS 'Contains user conversations. Demo data: General discussion with welcome message.';
COMMENT ON TABLE public.projects IS 'Contains group projects. Demo data: Onboarding project with demo team.';