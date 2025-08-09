-- Fix security issues from messaging migration

-- Fix function search path for messaging functions
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Fix get_or_create_direct_conversation function
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  conversation_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Check if conversation already exists between these users
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

  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', current_user_id)
    RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_id, current_user_id),
      (conversation_id, other_user_id);
  END IF;

  RETURN conversation_id;
END;
$$;