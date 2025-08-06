-- Enable RLS on all tables (some may already be enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with consistent naming and logic
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
DROP POLICY IF EXISTS "courses_manage_policy" ON public.courses;

DROP POLICY IF EXISTS "Admins and managers can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Users can view modules for active courses" ON public.modules;

DROP POLICY IF EXISTS "Admins and managers can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions for enrolled courses" ON public.quiz_questions;

DROP POLICY IF EXISTS "Admins and managers can manage answer options" ON public.quiz_answer_options;
DROP POLICY IF EXISTS "Users can view answer options for enrolled courses" ON public.quiz_answer_options;

DROP POLICY IF EXISTS "Users can view their own completions" ON public.completions;
DROP POLICY IF EXISTS "Users can insert their own completions" ON public.completions;
DROP POLICY IF EXISTS "Users can update their own completions" ON public.completions;
DROP POLICY IF EXISTS "Admins can manage all completions" ON public.completions;

DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can insert their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins can manage all certificates" ON public.certificates;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.user_course_enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollment progress" ON public.user_course_enrollments;
DROP POLICY IF EXISTS "Admins and managers can manage enrollments" ON public.user_course_enrollments;

-- Create comprehensive RLS policies for USERS table
CREATE POLICY "users_admin_full_access" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_manager_team_access" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.uid() = manager_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_worker_self_access" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create comprehensive RLS policies for COURSES table
CREATE POLICY "courses_admin_manager_full_access" ON public.courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'manager']))
  );

CREATE POLICY "courses_worker_view_active" ON public.courses
  FOR SELECT USING (is_active = true);

-- Create comprehensive RLS policies for MODULES table
CREATE POLICY "modules_admin_manager_full_access" ON public.modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'manager']))
  );

CREATE POLICY "modules_worker_view_enrolled" ON public.modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      JOIN public.user_course_enrollments uce ON c.id = uce.course_id
      WHERE c.id = modules.course_id 
        AND uce.user_id = auth.uid() 
        AND c.is_active = true
    )
  );

-- Create comprehensive RLS policies for QUIZ_QUESTIONS table
CREATE POLICY "quiz_questions_admin_manager_full_access" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'manager']))
  );

CREATE POLICY "quiz_questions_worker_view_enrolled" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      JOIN public.user_course_enrollments uce ON c.id = uce.course_id
      WHERE m.id = quiz_questions.module_id 
        AND uce.user_id = auth.uid() 
        AND c.is_active = true
    )
  );

-- Create comprehensive RLS policies for QUIZ_ANSWER_OPTIONS table
CREATE POLICY "quiz_answer_options_admin_manager_full_access" ON public.quiz_answer_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'manager']))
  );

CREATE POLICY "quiz_answer_options_worker_view_enrolled" ON public.quiz_answer_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.modules m ON m.id = qq.module_id
      JOIN public.courses c ON c.id = m.course_id
      JOIN public.user_course_enrollments uce ON c.id = uce.course_id
      WHERE qq.id = quiz_answer_options.question_id 
        AND uce.user_id = auth.uid() 
        AND c.is_active = true
    )
  );

-- Create comprehensive RLS policies for COMPLETIONS table
CREATE POLICY "completions_admin_full_access" ON public.completions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "completions_manager_team_access" ON public.completions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = completions.user_id 
        AND u.manager_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "completions_worker_self_access" ON public.completions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create comprehensive RLS policies for CERTIFICATES table
CREATE POLICY "certificates_admin_full_access" ON public.certificates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "certificates_manager_team_access" ON public.certificates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = certificates.user_id 
        AND u.manager_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "certificates_worker_self_access" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "certificates_worker_insert_self" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create comprehensive RLS policies for USER_COURSE_ENROLLMENTS table
CREATE POLICY "enrollments_admin_manager_full_access" ON public.user_course_enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'manager']))
  );

CREATE POLICY "enrollments_manager_team_access" ON public.user_course_enrollments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = user_course_enrollments.user_id 
        AND u.manager_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_worker_self_access" ON public.user_course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enrollments_worker_update_progress" ON public.user_course_enrollments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at columns using existing function
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

CREATE INDEX IF NOT EXISTS idx_courses_is_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order_index ON public.modules(order_index);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module_id ON public.quiz_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order_index ON public.quiz_questions(order_index);

CREATE INDEX IF NOT EXISTS idx_quiz_answer_options_question_id ON public.quiz_answer_options(question_id);

CREATE INDEX IF NOT EXISTS idx_completions_user_id ON public.completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_course_id ON public.completions(course_id);
CREATE INDEX IF NOT EXISTS idx_completions_module_id ON public.completions(module_id);
CREATE INDEX IF NOT EXISTS idx_completions_status ON public.completions(status);
CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON public.completions(completed_at);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry_date ON public.certificates(expiry_date);
CREATE INDEX IF NOT EXISTS idx_certificates_is_valid ON public.certificates(is_valid);

CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_user_id ON public.user_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_course_id ON public.user_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_status ON public.user_course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_due_date ON public.user_course_enrollments(due_date);