-- Add provider asset ID field to modules
ALTER TABLE public.modules 
ADD COLUMN provider_asset_id TEXT;