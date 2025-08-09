-- Create group projects system

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  max_team_size INTEGER NOT NULL DEFAULT 4,
  min_team_size INTEGER NOT NULL DEFAULT 2,
  due_date TIMESTAMP WITH TIME ZONE,
  submission_format TEXT CHECK (submission_format IN ('file', 'link', 'text')),
  instructions TEXT,
  grading_rubric JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_self_enrollment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project teams table
CREATE TABLE public.project_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_full BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create project submissions table
CREATE TABLE public.project_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  link_url TEXT,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('file', 'link', 'text')),
  is_final BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grade NUMERIC,
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMP WITH TIME ZONE
);

-- Create peer reviews table
CREATE TABLE public.peer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.project_submissions(id) ON DELETE CASCADE,
  reviewer_team_id UUID NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  review_criteria JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id, reviewer_team_id)
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in enrolled courses"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce
    WHERE uce.course_id = projects.course_id 
    AND uce.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Instructors can manage projects"
ON public.projects
FOR ALL
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

-- RLS Policies for project_teams
CREATE POLICY "Users can view teams in accessible projects"
ON public.project_teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.user_course_enrollments uce ON uce.course_id = p.course_id
    WHERE p.id = project_teams.project_id 
    AND uce.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Enrolled users can create teams"
ON public.project_teams
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.user_course_enrollments uce ON uce.course_id = p.course_id
    WHERE p.id = project_teams.project_id 
    AND uce.user_id = auth.uid()
    AND p.is_active = true
  )
);

CREATE POLICY "Team creators can update their teams"
ON public.project_teams
FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in accessible teams"
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_teams pt
    JOIN public.projects p ON p.id = pt.project_id
    JOIN public.user_course_enrollments uce ON uce.course_id = p.course_id
    WHERE pt.id = team_members.team_id 
    AND uce.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can join teams"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.project_teams pt
    JOIN public.projects p ON p.id = pt.project_id
    JOIN public.user_course_enrollments uce ON uce.course_id = p.course_id
    WHERE pt.id = team_members.team_id 
    AND uce.user_id = auth.uid()
    AND p.is_active = true
    AND p.allow_self_enrollment = true
  )
);

-- RLS Policies for project_submissions
CREATE POLICY "Team members can view their submissions"
ON public.project_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = project_submissions.team_id 
    AND tm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Team members can create submissions"
ON public.project_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = submitted_by AND
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = project_submissions.team_id 
    AND tm.user_id = auth.uid()
  )
);

-- RLS Policies for peer_reviews
CREATE POLICY "Users can view reviews for their submissions"
ON public.peer_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_submissions ps
    JOIN public.team_members tm ON tm.team_id = ps.team_id
    WHERE ps.id = peer_reviews.submission_id 
    AND tm.user_id = auth.uid()
  ) OR
  auth.uid() = reviewer_user_id OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Team members can create peer reviews"
ON public.peer_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_user_id AND
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = peer_reviews.reviewer_team_id 
    AND tm.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_projects_course_id ON public.projects(course_id);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_project_teams_project_id ON public.project_teams(project_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_project_submissions_team_id ON public.project_submissions(team_id);
CREATE INDEX idx_peer_reviews_submission_id ON public.peer_reviews(submission_id);

-- Create function to check team capacity
CREATE OR REPLACE FUNCTION public.check_team_capacity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_size INTEGER;
  max_size INTEGER;
BEGIN
  -- Get current team size and max size
  SELECT 
    COUNT(tm.id),
    p.max_team_size
  INTO current_size, max_size
  FROM public.team_members tm
  JOIN public.project_teams pt ON pt.id = tm.team_id
  JOIN public.projects p ON p.id = pt.project_id
  WHERE tm.team_id = NEW.team_id
  GROUP BY p.max_team_size;

  -- Check if team would exceed capacity
  IF current_size >= max_size THEN
    RAISE EXCEPTION 'Team is at maximum capacity of % members', max_size;
  END IF;

  -- Update team full status
  UPDATE public.project_teams 
  SET is_full = (current_size + 1 >= max_size)
  WHERE id = NEW.team_id;

  RETURN NEW;
END;
$$;

-- Create trigger for team capacity checking
CREATE TRIGGER check_team_capacity_trigger
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.check_team_capacity();

-- Create function to update project timestamps
CREATE OR REPLACE FUNCTION public.update_project_timestamps()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updating timestamps
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_project_timestamps();

CREATE TRIGGER update_project_teams_updated_at
BEFORE UPDATE ON public.project_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_project_timestamps();