-- Allow workers to self-enroll in courses while respecting RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_course_enrollments'
      AND policyname = 'enrollments_worker_insert_self'
  ) THEN
    EXECUTE '
      CREATE POLICY "enrollments_worker_insert_self" ON public.user_course_enrollments
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    ';
  END IF;
END;
$$;
