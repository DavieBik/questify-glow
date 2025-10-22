-- Create trigger to notify conversation participants when a new message arrives
CREATE OR REPLACE FUNCTION public.notify_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant RECORD;
BEGIN
  FOR participant IN
    SELECT cp.user_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id <> NEW.sender_id
      AND (cp.is_archived IS NULL OR cp.is_archived = false)
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      metadata,
      created_at
    )
    VALUES (
      participant.user_id,
      'chat_message',
      'New chat message',
      'You have received a new chat message.',
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      ),
      NEW.created_at
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_message ON public.messages;

CREATE TRIGGER notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_conversation_participants();
