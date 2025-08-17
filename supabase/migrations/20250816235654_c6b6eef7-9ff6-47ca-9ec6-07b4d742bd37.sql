-- Add external_id columns to existing tables
ALTER TABLE courses ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Add additional columns to modules table
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('video','pdf','scorm','link','survey')) DEFAULT 'pdf';

-- Create import_jobs table
CREATE TABLE IF NOT EXISTS import_jobs(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT CHECK (kind IN ('courses_modules','users_enrollments')) NOT NULL,
    source TEXT DEFAULT 'upload',
    status TEXT CHECK (status IN ('uploaded','validated','committed','failed')) DEFAULT 'uploaded',
    created_by UUID REFERENCES auth.users(id),
    totals JSONB DEFAULT '{}'::jsonb,
    file_path TEXT,
    original_filename TEXT,
    created_at TIMESTAMPTZ DEFAULT now(), 
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create import_job_errors table
CREATE TABLE IF NOT EXISTS import_job_errors(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INT,
    code TEXT,
    message TEXT,
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create import_mappings table
CREATE TABLE IF NOT EXISTS import_mappings(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    source_column TEXT,
    target_column TEXT,
    required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on import tables
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_job_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_jobs
CREATE POLICY "Users can view their own import jobs" ON import_jobs
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create import jobs" ON import_jobs
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own import jobs" ON import_jobs
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all import jobs" ON import_jobs
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
    ));

-- Create RLS policies for import_job_errors
CREATE POLICY "Users can view errors for their jobs" ON import_job_errors
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM import_jobs ij 
        WHERE ij.id = import_job_errors.job_id 
        AND ij.created_by = auth.uid()
    ));

CREATE POLICY "Users can create errors for their jobs" ON import_job_errors
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM import_jobs ij 
        WHERE ij.id = import_job_errors.job_id 
        AND ij.created_by = auth.uid()
    ));

-- Create RLS policies for import_mappings
CREATE POLICY "Users can manage mappings for their jobs" ON import_mappings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM import_jobs ij 
        WHERE ij.id = import_mappings.job_id 
        AND ij.created_by = auth.uid()
    ));

-- Create storage bucket for imports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for imports bucket
CREATE POLICY "Users can upload their own import files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own import files" ON storage.objects
    FOR SELECT USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own import files" ON storage.objects
    FOR DELETE USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_import_jobs_updated_at_trigger
    BEFORE UPDATE ON import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_import_jobs_updated_at();