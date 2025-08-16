-- Create approvals table for course enrollment requests
CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  course_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'enrollment',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  organization_id UUID NOT NULL DEFAULT get_default_org_id(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE public.approvals 
ADD CONSTRAINT approvals_status_check 
CHECK (status IN ('pending', 'approved', 'denied'));

ALTER TABLE public.approvals 
ADD CONSTRAINT approvals_request_type_check 
CHECK (request_type IN ('enrollment', 'completion', 'certificate'));

-- Create indexes for performance
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_approvals_organization ON public.approvals(organization_id);
CREATE INDEX idx_approvals_requested_by ON public.approvals(requested_by);
CREATE INDEX idx_approvals_user_id ON public.approvals(user_id);

-- Enable RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own approval requests" 
ON public.approvals 
FOR SELECT 
USING (auth.uid() = requested_by OR auth.uid() = user_id);

CREATE POLICY "Users can create approval requests" 
ON public.approvals 
FOR INSERT 
WITH CHECK (auth.uid() = requested_by AND organization_id = get_default_org_id());

CREATE POLICY "Managers can view org approval requests" 
ON public.approvals 
FOR SELECT 
USING (
  organization_id = get_default_org_id() AND 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager') 
    AND u.organization_id = get_default_org_id()
  )
);

CREATE POLICY "Managers can update approval requests" 
ON public.approvals 
FOR UPDATE 
USING (
  organization_id = get_default_org_id() AND 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager') 
    AND u.organization_id = get_default_org_id()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_approvals_updated_at
BEFORE UPDATE ON public.approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create approval request
CREATE OR REPLACE FUNCTION public.create_approval_request(
  p_user_id UUID,
  p_enrollment_id UUID,
  p_course_id UUID,
  p_request_type TEXT DEFAULT 'enrollment'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval_id UUID;
BEGIN
  -- Insert approval request
  INSERT INTO public.approvals (
    user_id,
    enrollment_id,
    course_id,
    request_type,
    requested_by,
    organization_id
  )
  VALUES (
    p_user_id,
    p_enrollment_id,
    p_course_id,
    p_request_type,
    auth.uid(),
    get_default_org_id()
  )
  RETURNING id INTO v_approval_id;

  RETURN v_approval_id;
END;
$$;

-- Function to process approval
CREATE OR REPLACE FUNCTION public.process_approval(
  p_approval_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval RECORD;
  v_user_role TEXT;
BEGIN
  -- Check if user is admin/manager
  SELECT u.role INTO v_user_role
  FROM public.users u 
  WHERE u.id = auth.uid() 
  AND u.organization_id = get_default_org_id();
  
  IF v_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Get approval details
  SELECT * INTO v_approval
  FROM public.approvals
  WHERE id = p_approval_id
  AND organization_id = get_default_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found.';
  END IF;

  IF v_approval.status != 'pending' THEN
    RAISE EXCEPTION 'Approval request already processed.';
  END IF;

  -- Update approval
  UPDATE public.approvals
  SET 
    status = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    reviewer_notes = p_notes,
    updated_at = now()
  WHERE id = p_approval_id;

  -- If approved and it's an enrollment request, update enrollment status
  IF p_status = 'approved' AND v_approval.request_type = 'enrollment' THEN
    UPDATE public.user_course_enrollments
    SET status = 'enrolled'
    WHERE id = v_approval.enrollment_id;
  END IF;

  -- If denied and it's an enrollment request, update enrollment status
  IF p_status = 'denied' AND v_approval.request_type = 'enrollment' THEN
    UPDATE public.user_course_enrollments
    SET status = 'denied'
    WHERE id = v_approval.enrollment_id;
  END IF;

  RETURN TRUE;
END;
$$;