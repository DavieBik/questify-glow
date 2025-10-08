-- QA Fix Pack Phase 1: Safe additions (non-destructive)
-- This migration adds missing views, indexes, constraints, and disabled policies

-- ============================================================================
-- 1. CREATE MISSING MATERIALIZED VIEW: mv_course_metrics
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_course_metrics AS
SELECT 
  c.id as course_id,
  c.title as course_title,
  c.category,
  c.difficulty::text as difficulty,
  COUNT(DISTINCT uce.user_id) FILTER (WHERE uce.status IN ('enrolled', 'in_progress', 'completed')) as enrolled_users,
  COUNT(DISTINCT uce.user_id) FILTER (WHERE uce.status = 'completed') as completed_users,
  CASE 
    WHEN COUNT(DISTINCT uce.user_id) FILTER (WHERE uce.status IN ('enrolled', 'in_progress', 'completed')) > 0
    THEN ROUND(
      (COUNT(DISTINCT uce.user_id) FILTER (WHERE uce.status = 'completed')::numeric / 
       COUNT(DISTINCT uce.user_id) FILTER (WHERE uce.status IN ('enrolled', 'in_progress', 'completed'))::numeric) * 100, 
      2
    )
    ELSE 0
  END as completion_rate,
  COALESCE(AVG(comp.score_percentage) FILTER (WHERE comp.status = 'completed'), 0) as avg_score,
  COALESCE(AVG(comp.time_spent_minutes) FILTER (WHERE comp.status = 'completed'), 0) as avg_time_minutes,
  COUNT(comp.id) FILTER (WHERE comp.status IN ('completed', 'failed')) as total_attempts,
  COUNT(comp.id) FILTER (WHERE comp.status = 'completed' AND comp.score_percentage >= 80) as passed_attempts
FROM public.courses c
LEFT JOIN public.user_course_enrollments uce ON uce.course_id = c.id
LEFT JOIN public.completions comp ON comp.course_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.title, c.category, c.difficulty;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_course_metrics_course_id_idx ON public.mv_course_metrics(course_id);

-- ============================================================================
-- 2. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Certificates table indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON public.certificates(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON public.certificates(certificate_number);

-- Completions table indexes
CREATE INDEX IF NOT EXISTS idx_completions_user_course ON public.completions(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_completions_status ON public.completions(status);
CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON public.completions(completed_at DESC) WHERE status = 'completed';

-- User course enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status ON public.user_course_enrollments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_due_at ON public.user_course_enrollments(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_enrollment_date ON public.user_course_enrollments(enrollment_date DESC);

-- Modules table indexes
CREATE INDEX IF NOT EXISTS idx_modules_course_order ON public.modules(course_id, order_index);

-- ============================================================================
-- 3. ADD UNIQUE CONSTRAINTS
-- ============================================================================

-- Ensure certificate numbers are unique
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_certificate_number_unique'
  ) THEN
    ALTER TABLE public.certificates 
    ADD CONSTRAINT certificates_certificate_number_unique 
    UNIQUE (certificate_number);
  END IF;
END $$;

-- ============================================================================
-- 4. ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure certificate scores are valid percentages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_valid_score'
  ) THEN
    ALTER TABLE public.certificates 
    ADD CONSTRAINT certificates_valid_score 
    CHECK (final_score_percentage >= 0 AND final_score_percentage <= 100);
  END IF;
END $$;

-- Ensure completion scores are valid
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'completions_valid_score'
  ) THEN
    ALTER TABLE public.completions 
    ADD CONSTRAINT completions_valid_score 
    CHECK (score_percentage IS NULL OR (score_percentage >= 0 AND score_percentage <= 100));
  END IF;
END $$;

-- Ensure time spent is non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'completions_valid_time'
  ) THEN
    ALTER TABLE public.completions 
    ADD CONSTRAINT completions_valid_time 
    CHECK (time_spent_minutes IS NULL OR time_spent_minutes >= 0);
  END IF;
END $$;