-- Add archival support for conversation participation
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Ensure existing rows have the default applied
UPDATE public.conversation_participants
SET is_archived = false
WHERE is_archived IS NULL;

-- Optional helpful index for filtering active conversations
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active
  ON public.conversation_participants (conversation_id, user_id, is_archived)
  WHERE is_archived = false;
