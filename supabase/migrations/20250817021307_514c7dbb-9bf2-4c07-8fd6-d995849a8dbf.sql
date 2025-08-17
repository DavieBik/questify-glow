-- Add entry_path column to scorm_packages table
ALTER TABLE public.scorm_packages 
ADD COLUMN entry_path TEXT;

-- Add comment for the new column
COMMENT ON COLUMN public.scorm_packages.entry_path IS 'The launch file path within the SCORM package (e.g. index.html, sco.html)';

-- Create index for better performance when querying by entry_path
CREATE INDEX idx_scorm_packages_entry_path ON public.scorm_packages(entry_path);