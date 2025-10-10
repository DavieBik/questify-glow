-- Fix rpc_team_compliance type mismatch by casting department to text
CREATE OR REPLACE FUNCTION public.rpc_team_compliance(
  date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  date_to date DEFAULT CURRENT_DATE, 
  department_filter text DEFAULT NULL::text, 
  allow_preview boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid, 
  user_name text, 
  email text, 
  department text, 
  role user_role, 
  required_courses bigint, 
  assigned_courses bigint, 
  completed_courses bigint, 
  overdue_courses bigint, 
  completion_percentage numeric, 
  last_activity date
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  org_id UUID;
BEGIN
  -- Get current user role and org
  SELECT u.role::text, u.organization_id INTO current_user_role, org_id
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check - allow if admin/manager OR if preview is enabled
  IF NOT (current_user_role IN ('admin', 'manager') OR allow_preview) THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Use default org if not multi-tenant
  IF org_id IS NULL THEN
    org_id := get_default_org_id();
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email)::text as user_name,
    u.email::text,
    COALESCE(u.department, 'Unassigned')::text as department,
    u.role,
    
    -- Required courses (mandatory courses in org)
    COUNT(DISTINCT CASE WHEN c.is_mandatory = true THEN c.id END) as required_courses,
    
    -- Assigned courses (via enrollments)
    COUNT(DISTINCT uce.course_id) as assigned_courses,
    
    -- Completed courses
    COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.course_id END) as completed_courses,
    
    -- Overdue courses (due_at passed and not completed)
    COUNT(DISTINCT CASE 
      WHEN uce.due_at < now() AND uce.status NOT IN ('completed', 'denied') 
      THEN uce.course_id 
    END) as overdue_courses,
    
    -- Completion percentage
    CASE 
      WHEN COUNT(DISTINCT uce.course_id) > 0
      THEN ROUND((COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.course_id END)::numeric / 
                  COUNT(DISTINCT uce.course_id)::numeric) * 100, 2)
      ELSE 0
    END as completion_percentage,
    
    -- Last activity
    MAX(comp.completed_at)::date as last_activity
    
  FROM public.users u
  LEFT JOIN public.user_course_enrollments uce ON u.id = uce.user_id
  LEFT JOIN public.courses c ON c.id = uce.course_id
  LEFT JOIN public.completions comp ON comp.user_id = u.id
  WHERE u.organization_id = org_id
  AND u.is_active = true
  AND (department_filter IS NULL OR u.department = department_filter)
  GROUP BY u.id, u.first_name, u.last_name, u.email, u.department, u.role
  ORDER BY overdue_courses DESC, completion_percentage ASC;
END;
$function$;