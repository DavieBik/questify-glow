-- Enforce role-aware messaging permissions
-- Allows admins to message anyone in their organization
-- Managers can reach out to admins
-- Workers can contact admins, managers, and peers enrolled in the same courses

-- Helper returning the current user's role and organization
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS TABLE(id uuid, role user_role, organization_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.id, u.role, u.organization_id
  FROM public.users u
  WHERE u.id = auth.uid();
$$;

-- Set-returning function that lists IDs the caller may message
CREATE OR REPLACE FUNCTION public.message_allowed_recipients()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH cu AS (
    SELECT *
    FROM public.current_user_profile()
  ),
  course_peers AS (
    SELECT DISTINCT peer.user_id AS id
    FROM cu
    JOIN public.user_course_enrollments enroll
      ON enroll.user_id = cu.id
    JOIN public.user_course_enrollments peer
      ON peer.course_id = enroll.course_id
     AND peer.user_id <> cu.id
  )
  SELECT u.id
  FROM cu
  JOIN public.users u
    ON u.organization_id = cu.organization_id
   AND u.id <> cu.id
  WHERE
    CASE cu.role
      WHEN 'admin'::user_role
        THEN TRUE
      WHEN 'manager'::user_role
        THEN u.role = 'admin'::user_role
      ELSE
        u.role IN ('admin'::user_role, 'manager'::user_role)
        OR u.id IN (SELECT id FROM course_peers)
    END;
$$;

-- Convenience function returning full recipient details for the UI
CREATE OR REPLACE FUNCTION public.message_allowed_recipient_list()
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  role user_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.id,
         u.first_name,
         u.last_name,
         u.email,
         u.role
  FROM public.message_allowed_recipients() ar
  JOIN public.users u ON u.id = ar.user_id;
$$;

-- Update the helper function that creates or returns direct conversations
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  conversation_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Ensure the target user is allowed
  IF NOT EXISTS (
    SELECT 1 FROM public.message_allowed_recipients() ar WHERE ar.user_id = other_user_id
  ) THEN
    RAISE EXCEPTION 'You are not permitted to message this user';
  END IF;

  -- Check for existing direct conversation
  SELECT c.id INTO conversation_id
  FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
    AND (
      SELECT COUNT(*) FROM public.conversation_participants cp3
      WHERE cp3.conversation_id = c.id
    ) = 2;

  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', current_user_id)
    RETURNING id INTO conversation_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_id, current_user_id),
      (conversation_id, other_user_id);
  END IF;

  RETURN conversation_id;
END;
$$;

-- Tighten participant insert policy so only permitted users can be added
DROP POLICY IF EXISTS "Users can join conversations they're invited to" ON public.conversation_participants;
CREATE POLICY "Users can join allowed conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  -- Adding self to an existing conversation the user participates in
  (
    auth.uid() = user_id AND
    (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
          AND cp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_participants.conversation_id
          AND c.created_by = auth.uid()
      )
    )
  )
  OR
  -- Conversation creator adding an allowed recipient
  (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.message_allowed_recipients() ar
      WHERE ar.user_id = conversation_participants.user_id
    )
  )
);
