-- Verify and ensure attachment_urls column exists on features table
-- This column is used by both features and feature suggestions for attachments

-- Check if the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'features' 
  AND column_name = 'attachment_urls';

-- If the query above returns no rows, the column doesn't exist and needs to be added
-- If it returns a row, the column already exists

-- Add the column if it doesn't exist (safe to run even if it exists)
ALTER TABLE public.features 
ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.features.attachment_urls IS 'Array of public URLs for feature attachments stored in Supabase Storage';

-- Verify the column exists now
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'features' 
  AND column_name = 'attachment_urls';
