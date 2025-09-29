-- Update RPC functions to support role preview by checking environment or allowing preview access

-- Update rpc_manager_dashboard_metrics to allow preview access
CREATE OR REPLACE FUNCTION public.rpc_manager_dashboard_metrics(date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(overdue_enrollments bigint, due_soon_enrollments bigint, completion_rate_30d numeric, active_learners_7d bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  org_id UUID;
  is_preview_enabled BOOLEAN := false;
BEGIN
  -- Check if role preview is enabled (this allows preview access)
  BEGIN
    is_preview_enabled := current_setting('app.enable_role_preview', true)::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      is_preview_enabled := false;
  END;

  -- Get current user role and org
  SELECT u.role, u.organization_id INTO current_user_role, org_id
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check - allow if admin/manager OR if preview is enabled
  IF NOT (current_user_role IN ('admin', 'manager') OR is_preview_enabled) THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Use default org if not multi-tenant
  IF org_id IS NULL THEN
    org_id := get_default_org_id();
  END IF;

  RETURN QUERY
  WITH metrics AS (
    SELECT 
      -- Overdue enrollments (due_at passed and not completed)
      COUNT(CASE 
        WHEN uce.due_at < now() AND uce.status NOT IN ('completed', 'denied') 
        THEN 1 
      END) as overdue_count,
      
      -- Due soon (next 7 days)
      COUNT(CASE 
        WHEN uce.due_at BETWEEN now() AND (now() + INTERVAL '7 days') 
        AND uce.status NOT IN ('completed', 'denied')
        THEN 1 
      END) as due_soon_count,
      
      -- Completion rate last 30 days
      CASE 
        WHEN COUNT(CASE WHEN uce.enrollment_date >= date_from THEN 1 END) > 0
        THEN ROUND(
          (COUNT(CASE WHEN uce.enrollment_date >= date_from AND uce.status = 'completed' THEN 1 END)::numeric / 
           COUNT(CASE WHEN uce.enrollment_date >= date_from THEN 1 END)::numeric) * 100, 2
        )
        ELSE 0
      END as completion_rate,
      
      -- Active learners last 7 days (had activity)
      COUNT(DISTINCT CASE 
        WHEN c.completed_at >= (now() - INTERVAL '7 days') 
        THEN c.user_id 
      END) as active_learners
      
    FROM public.user_course_enrollments uce
    JOIN public.users u ON u.id = uce.user_id
    LEFT JOIN public.completions c ON c.user_id = uce.user_id
    WHERE u.organization_id = org_id
    AND u.is_active = true
  )
  SELECT 
    m.overdue_count,
    m.due_soon_count, 
    m.completion_rate,
    m.active_learners
  FROM metrics m;
END;
$function$;

-- Update rpc_team_compliance to allow preview access  
CREATE OR REPLACE FUNCTION public.rpc_team_compliance(date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), date_to date DEFAULT CURRENT_DATE, department_filter text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, user_name text, email text, department text, role user_role, required_courses bigint, assigned_courses bigint, completed_courses bigint, overdue_courses bigint, completion_percentage numeric, last_activity date)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  org_id UUID;
  is_preview_enabled BOOLEAN := false;
BEGIN
  -- Check if role preview is enabled
  BEGIN
    is_preview_enabled := current_setting('app.enable_role_preview', true)::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      is_preview_enabled := false;
  END;

  -- Get current user role and org
  SELECT u.role, u.organization_id INTO current_user_role, org_id
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check - allow if admin/manager OR if preview is enabled
  IF NOT (current_user_role IN ('admin', 'manager') OR is_preview_enabled) THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Use default org if not multi-tenant
  IF org_id IS NULL THEN
    org_id := get_default_org_id();
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
    u.email,
    COALESCE(u.department, 'Unassigned') as department,
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

-- Update rpc_approvals_queue to allow preview access
CREATE OR REPLACE FUNCTION public.rpc_approvals_queue()
 RETURNS TABLE(id uuid, user_name text, user_email text, course_title text, request_type text, requested_at timestamp with time zone, status text, reviewer_notes text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  org_id UUID;
  is_preview_enabled BOOLEAN := false;
BEGIN
  -- Check if role preview is enabled
  BEGIN
    is_preview_enabled := current_setting('app.enable_role_preview', true)::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      is_preview_enabled := false;
  END;

  -- Get current user role and org
  SELECT u.role, u.organization_id INTO current_user_role, org_id
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check - allow if admin/manager OR if preview is enabled
  IF NOT (current_user_role IN ('admin', 'manager') OR is_preview_enabled) THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Use default org if not multi-tenant
  IF org_id IS NULL THEN
    org_id := get_default_org_id();
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
    u.email as user_email,
    c.title as course_title,
    a.request_type,
    a.requested_at,
    a.status,
    a.reviewer_notes
  FROM public.approvals a
  JOIN public.users u ON u.id = a.user_id
  JOIN public.courses c ON c.id = a.course_id
  WHERE a.organization_id = org_id
  AND a.status = 'pending'
  ORDER BY a.requested_at ASC;
END;
$function$;