-- Interactive Learning Paths: Course Prerequisites
CREATE TABLE public.course_prerequisites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id)
);

ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view course prerequisites for active courses" 
ON public.course_prerequisites 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.courses c1, public.courses c2
    WHERE c1.id = course_id AND c2.id = prerequisite_course_id 
    AND c1.is_active = true AND c2.is_active = true
  )
);

CREATE POLICY "Admins and managers can manage course prerequisites" 
ON public.course_prerequisites 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Social Learning: Forums
CREATE TABLE public.forums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forums for enrolled courses" 
ON public.forums 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce, public.courses c
    WHERE uce.course_id = forums.course_id AND c.id = forums.course_id
    AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Enrolled users can create forums" 
ON public.forums 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce, public.courses c
    WHERE uce.course_id = forums.course_id AND c.id = forums.course_id
    AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Admins and managers can manage all forums" 
ON public.forums 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Social Learning: Forum Posts
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in forums for enrolled courses" 
ON public.forum_posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.forums f, public.user_course_enrollments uce, public.courses c
    WHERE f.id = forum_posts.forum_id AND uce.course_id = f.course_id 
    AND c.id = f.course_id AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Enrolled users can create posts" 
ON public.forum_posts 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.forums f, public.user_course_enrollments uce, public.courses c
    WHERE f.id = forum_posts.forum_id AND uce.course_id = f.course_id 
    AND c.id = f.course_id AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Users can update their own posts" 
ON public.forum_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can manage all posts" 
ON public.forum_posts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Social Learning: Study Groups
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups for enrolled courses" 
ON public.groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce, public.courses c
    WHERE uce.course_id = groups.course_id AND c.id = groups.course_id
    AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Enrolled users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce, public.courses c
    WHERE uce.course_id = groups.course_id AND c.id = groups.course_id
    AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Admins and managers can manage all groups" 
ON public.groups 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Study Group Members
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members for enrolled courses" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.groups g, public.user_course_enrollments uce, public.courses c
    WHERE g.id = group_members.group_id AND uce.course_id = g.course_id 
    AND c.id = g.course_id AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Enrolled users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.groups g, public.user_course_enrollments uce, public.courses c
    WHERE g.id = group_members.group_id AND uce.course_id = g.course_id 
    AND c.id = g.course_id AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can manage group members" 
ON public.group_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Gamification: Add points to completions
ALTER TABLE public.completions ADD COLUMN points INTEGER DEFAULT 0;

-- Gamification: Badges
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_sql TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all badges" 
ON public.badges 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage badges" 
ON public.badges 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
  )
);

-- User Badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges" 
ON public.user_badges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user badges" 
ON public.user_badges 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
  )
);

-- Gamification: Learning Streaks - Add last_completion_date to users
ALTER TABLE public.users ADD COLUMN last_completion_date DATE;

-- Live Sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  join_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions for enrolled courses" 
ON public.sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce, public.courses c
    WHERE uce.course_id = sessions.course_id AND c.id = sessions.course_id
    AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Admins and managers can manage sessions" 
ON public.sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Session RSVP
CREATE TABLE public.session_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'attending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view RSVPs for enrolled course sessions" 
ON public.session_rsvps 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s, public.user_course_enrollments uce, public.courses c
    WHERE s.id = session_rsvps.session_id AND uce.course_id = s.course_id 
    AND c.id = s.course_id AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Enrolled users can RSVP to sessions" 
ON public.session_rsvps 
FOR ALL 
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.sessions s, public.user_course_enrollments uce, public.courses c
    WHERE s.id = session_rsvps.session_id AND uce.course_id = s.course_id 
    AND c.id = s.course_id AND uce.user_id = auth.uid() AND c.is_active = true
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_forums_updated_at
BEFORE UPDATE ON public.forums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_badges_updated_at
BEFORE UPDATE ON public.badges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial badges
INSERT INTO public.badges (name, description, icon_url, criteria_sql) VALUES
('First Course', 'Complete your first course', '🎯', 'SELECT COUNT(*) FROM completions WHERE user_id = $1 AND status = ''completed'' HAVING COUNT(*) >= 1'),
('Quick Learner', 'Complete a course in under 60 minutes', '⚡', 'SELECT COUNT(*) FROM completions WHERE user_id = $1 AND status = ''completed'' AND time_spent_minutes <= 60 HAVING COUNT(*) >= 1'),
('Dedicated Student', 'Complete 5 courses', '📚', 'SELECT COUNT(*) FROM completions WHERE user_id = $1 AND status = ''completed'' HAVING COUNT(*) >= 5'),
('Perfect Score', 'Get 100% on any quiz', '💯', 'SELECT COUNT(*) FROM completions WHERE user_id = $1 AND score_percentage = 100 HAVING COUNT(*) >= 1'),
('Social Butterfly', 'Create 10 forum posts', '🦋', 'SELECT COUNT(*) FROM forum_posts WHERE user_id = $1 HAVING COUNT(*) >= 10');

-- Function to auto-enroll in unlocked courses
CREATE OR REPLACE FUNCTION public.auto_enroll_unlocked_courses()
RETURNS TRIGGER AS $$
DECLARE
  unlocked_course_id UUID;
BEGIN
  -- Find courses that are now unlocked for this user
  FOR unlocked_course_id IN 
    SELECT DISTINCT cp.course_id
    FROM public.course_prerequisites cp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_course_enrollments uce
      WHERE uce.course_id = cp.course_id AND uce.user_id = NEW.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.course_prerequisites cp2
      WHERE cp2.course_id = cp.course_id
      AND NOT EXISTS (
        SELECT 1 FROM public.completions c
        WHERE c.course_id = cp2.prerequisite_course_id 
        AND c.user_id = NEW.user_id 
        AND c.status = 'completed'
      )
    )
  LOOP
    -- Auto-enroll the user in the unlocked course
    INSERT INTO public.user_course_enrollments (user_id, course_id, status)
    VALUES (NEW.user_id, unlocked_course_id, 'enrolled')
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END LOOP;

  -- Award points for completion (10 points)
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.completions 
    SET points = 10 
    WHERE id = NEW.id AND points IS NULL;
    
    -- Update learning streak
    UPDATE public.users 
    SET last_completion_date = CURRENT_DATE
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_enroll_on_completion
AFTER INSERT OR UPDATE ON public.completions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.auto_enroll_unlocked_courses();