-- Add foreign key from conversation_participants to users
ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- Add foreign key from messages to users
ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- Create the message_allowed_recipient_list function
CREATE OR REPLACE FUNCTION public.message_allowed_recipient_list()
RETURNS TABLE(id uuid, first_name text, last_name text, email text, role user_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.first_name, u.last_name, u.email, u.role
  FROM public.users u
  WHERE u.is_active = true
  AND u.id != auth.uid()
  AND u.organization_id = get_default_org_id()
  ORDER BY u.first_name, u.last_name;
$$;