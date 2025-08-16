-- Create curricula table
CREATE TABLE public.curricula (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  organization_id uuid NOT NULL DEFAULT get_default_org_id(),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create curriculum_items table
CREATE TABLE public.curriculum_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id uuid NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  due_days_offset integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(curriculum_id, course_id),
  UNIQUE(curriculum_id, position)
);

-- Create enum for curriculum assignment status
CREATE TYPE curriculum_assignment_status AS ENUM ('assigned', 'in_progress', 'completed', 'overdue');

-- Create curriculum_assignments table
CREATE TABLE public.curriculum_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id uuid NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  due_at timestamp with time zone,
  status curriculum_assignment_status NOT NULL DEFAULT 'assigned',
  organization_id uuid NOT NULL DEFAULT get_default_org_id(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(curriculum_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for curricula
CREATE POLICY "org_members_can_view_curricula" 
ON public.curricula FOR SELECT 
USING (
  organization_id = get_default_org_id() 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "org_admins_managers_can_manage_curricula" 
ON public.curricula FOR ALL 
USING (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
)
WITH CHECK (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- RLS policies for curriculum_items
CREATE POLICY "org_members_can_view_curriculum_items" 
ON public.curriculum_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.curricula c 
    WHERE c.id = curriculum_items.curriculum_id 
    AND c.organization_id = get_default_org_id()
  ) 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "org_admins_managers_can_manage_curriculum_items" 
ON public.curriculum_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.curricula c 
    WHERE c.id = curriculum_items.curriculum_id 
    AND c.organization_id = get_default_org_id()
  ) 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curricula c 
    WHERE c.id = curriculum_items.curriculum_id 
    AND c.organization_id = get_default_org_id()
  ) 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- RLS policies for curriculum_assignments
CREATE POLICY "org_members_can_view_curriculum_assignments" 
ON public.curriculum_assignments FOR SELECT 
USING (
  organization_id = get_default_org_id() 
  AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  )
);

CREATE POLICY "org_admins_managers_can_manage_curriculum_assignments" 
ON public.curriculum_assignments FOR ALL 
USING (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
)
WITH CHECK (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- Create function to auto-enroll users in curriculum courses
CREATE OR REPLACE FUNCTION public.assign_curriculum_to_user(
  p_curriculum_id uuid,
  p_user_id uuid,
  p_assigned_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid;
  v_curriculum_item record;
  v_due_date timestamp with time zone;
BEGIN
  -- Create the curriculum assignment
  INSERT INTO public.curriculum_assignments (
    curriculum_id,
    user_id,
    assigned_by,
    organization_id
  ) VALUES (
    p_curriculum_id,
    p_user_id,
    p_assigned_by,
    get_default_org_id()
  )
  RETURNING id INTO v_assignment_id;

  -- Create enrollments for each course in the curriculum
  FOR v_curriculum_item IN 
    SELECT ci.course_id, ci.due_days_offset, ci.position
    FROM public.curriculum_items ci
    WHERE ci.curriculum_id = p_curriculum_id
    ORDER BY ci.position
  LOOP
    -- Calculate due date if offset is specified
    v_due_date := NULL;
    IF v_curriculum_item.due_days_offset IS NOT NULL THEN
      v_due_date := now() + (v_curriculum_item.due_days_offset || ' days')::interval;
    END IF;

    -- Create course enrollment
    INSERT INTO public.user_course_enrollments (
      user_id,
      course_id,
      status,
      due_at,
      enrollment_date
    ) VALUES (
      p_user_id,
      v_curriculum_item.course_id,
      'enrolled',
      v_due_date,
      now()
    )
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END LOOP;

  RETURN v_assignment_id;
END;
$$;

-- Create function to update curriculum assignment progress
CREATE OR REPLACE FUNCTION public.update_curriculum_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curriculum_assignment record;
  v_total_items integer;
  v_completed_items integer;
  v_new_status curriculum_assignment_status;
BEGIN
  -- Find curriculum assignments for this user and course
  FOR v_curriculum_assignment IN
    SELECT ca.id, ca.curriculum_id, ca.user_id, ca.due_at
    FROM public.curriculum_assignments ca
    JOIN public.curriculum_items ci ON ci.curriculum_id = ca.curriculum_id
    WHERE ca.user_id = NEW.user_id 
    AND ci.course_id = NEW.course_id
  LOOP
    -- Count total items in curriculum
    SELECT COUNT(*) INTO v_total_items
    FROM public.curriculum_items ci
    WHERE ci.curriculum_id = v_curriculum_assignment.curriculum_id;

    -- Count completed course enrollments for this user in this curriculum
    SELECT COUNT(*) INTO v_completed_items
    FROM public.curriculum_items ci
    JOIN public.user_course_enrollments uce ON uce.course_id = ci.course_id
    WHERE ci.curriculum_id = v_curriculum_assignment.curriculum_id
    AND uce.user_id = v_curriculum_assignment.user_id
    AND uce.status = 'completed';

    -- Determine new status
    IF v_completed_items = v_total_items THEN
      v_new_status := 'completed';
    ELSIF v_completed_items > 0 THEN
      v_new_status := 'in_progress';
    ELSIF v_curriculum_assignment.due_at IS NOT NULL AND v_curriculum_assignment.due_at < now() THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'assigned';
    END IF;

    -- Update curriculum assignment status
    UPDATE public.curriculum_assignments
    SET 
      status = v_new_status,
      updated_at = now()
    WHERE id = v_curriculum_assignment.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger to update curriculum progress when course enrollment status changes
CREATE TRIGGER update_curriculum_progress_trigger
  AFTER UPDATE OF status ON public.user_course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_curriculum_progress();

-- Add updated_at triggers
CREATE TRIGGER update_curricula_updated_at
  BEFORE UPDATE ON public.curricula
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_items_updated_at
  BEFORE UPDATE ON public.curriculum_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_assignments_updated_at
  BEFORE UPDATE ON public.curriculum_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();