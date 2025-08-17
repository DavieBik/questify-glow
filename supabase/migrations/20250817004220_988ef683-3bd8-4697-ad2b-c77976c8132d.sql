-- Add video provider and progress tracking columns to modules
ALTER TABLE public.modules 
ADD COLUMN provider TEXT CHECK (provider IN ('storage','youtube','vimeo','mux','cloudflare')) DEFAULT 'storage',
ADD COLUMN poster_url TEXT,
ADD COLUMN captions_url TEXT,
ADD COLUMN duration_seconds INTEGER,
ADD COLUMN require_watch_pct NUMERIC DEFAULT 0.9,
ADD COLUMN status TEXT DEFAULT 'ready';

-- Create user module progress tracking table
CREATE TABLE public.user_module_progress (
  user_id UUID NOT NULL,
  module_id UUID NOT NULL,
  last_position_seconds INTEGER DEFAULT 0,
  watched_pct NUMERIC DEFAULT 0.0,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE
);

-- Enable RLS on user_module_progress
ALTER TABLE public.user_module_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_module_progress
CREATE POLICY "Users can manage their own progress" 
ON public.user_module_progress 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" 
ON public.user_module_progress 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users u 
  WHERE u.id = auth.uid() 
  AND u.role = 'admin'::user_role
));

-- Create trigger for updated_at
CREATE TRIGGER update_user_module_progress_updated_at
  BEFORE UPDATE ON public.user_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();