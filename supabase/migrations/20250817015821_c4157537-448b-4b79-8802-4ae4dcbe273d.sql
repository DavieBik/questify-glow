-- Create SCORM support tables
-- This implements SCORM 1.2 and SCORM 2004 package tracking

-- SCORM packages table
CREATE TABLE public.scorm_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  version TEXT NOT NULL CHECK (version IN ('1.2', '2004')),
  storage_path TEXT NOT NULL,
  created_by UUID NOT NULL,
  organization_id UUID NOT NULL DEFAULT get_default_org_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SCORM user sessions table
CREATE TABLE public.scorm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.scorm_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')) DEFAULT 'not_started',
  score NUMERIC,
  total_time INTERVAL DEFAULT '0',
  data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique attempts per user/package combination
  UNIQUE(package_id, user_id, attempt)
);

-- SCORM interactions/tracking table
CREATE TABLE public.scorm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.scorm_sessions(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  element TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_scorm_packages_created_by ON public.scorm_packages(created_by);
CREATE INDEX idx_scorm_packages_org ON public.scorm_packages(organization_id);
CREATE INDEX idx_scorm_sessions_package_user ON public.scorm_sessions(package_id, user_id);
CREATE INDEX idx_scorm_sessions_user ON public.scorm_sessions(user_id);
CREATE INDEX idx_scorm_interactions_session ON public.scorm_interactions(session_id);
CREATE INDEX idx_scorm_interactions_element ON public.scorm_interactions(element);

-- Create updated_at triggers
CREATE TRIGGER update_scorm_packages_updated_at
  BEFORE UPDATE ON public.scorm_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scorm_sessions_updated_at
  BEFORE UPDATE ON public.scorm_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorm_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scorm_packages
CREATE POLICY "Admins and managers can manage SCORM packages" 
  ON public.scorm_packages
  FOR ALL
  USING (
    organization_id = get_default_org_id() AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  )
  WITH CHECK (
    organization_id = get_default_org_id() AND
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  );

CREATE POLICY "Org members can view SCORM packages"
  ON public.scorm_packages
  FOR SELECT
  USING (
    organization_id = get_default_org_id() AND
    auth.uid() IS NOT NULL
  );

-- RLS Policies for scorm_sessions
CREATE POLICY "Users can manage their own SCORM sessions"
  ON public.scorm_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all SCORM sessions"
  ON public.scorm_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  );

-- RLS Policies for scorm_interactions
CREATE POLICY "Users can manage interactions for their sessions"
  ON public.scorm_interactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.scorm_sessions ss
      WHERE ss.id = scorm_interactions.session_id
      AND ss.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scorm_sessions ss
      WHERE ss.id = scorm_interactions.session_id
      AND ss.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all SCORM interactions"
  ON public.scorm_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  );

-- Create storage bucket for SCORM packages
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scorm', 'scorm', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for SCORM packages
CREATE POLICY "Admins can upload SCORM packages"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'scorm' AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  );

CREATE POLICY "Admins can manage SCORM packages"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'scorm' AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager')
      AND u.organization_id = get_default_org_id()
    )
  );

CREATE POLICY "Org members can download SCORM packages"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'scorm' AND
    auth.uid() IS NOT NULL
  );