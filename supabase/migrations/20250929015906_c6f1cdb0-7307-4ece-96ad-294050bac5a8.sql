-- Create a function to enable role preview for the current session
CREATE OR REPLACE FUNCTION public.enable_role_preview()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set the session variable to enable role preview
  PERFORM set_config('app.enable_role_preview', 'true', true);
  RETURN true;
END;
$function$;