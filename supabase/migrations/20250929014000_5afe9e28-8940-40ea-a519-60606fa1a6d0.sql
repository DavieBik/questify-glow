-- Fix infinite recursion in conversation_participants RLS policy
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view their conversation participants" ON conversation_participants;

-- Create a security definer function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  );
$$;

-- Create new safe policy using the security definer function
CREATE POLICY "Users can view conversation participants"
ON conversation_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_conversation_participant(auth.uid(), conversation_id)
);

-- Also ensure the conversations policy works correctly
DROP POLICY IF EXISTS "org_users_can_view_their_conversations" ON conversations;
CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(auth.uid(), id)
);