-- Fixed database restore script
-- This script drops existing constraints before adding them to avoid conflicts

-- First, drop all existing constraints on azure_devops_config if they exist
DO $$
BEGIN
    -- Drop primary key constraint if it exists
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_pkey;
    
    -- Drop unique constraint if it exists
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_session_id_key;
    
    -- Drop foreign key constraint if it exists
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_session_id_fkey;
END $$;

-- Now run the backup file, but we need to modify the constraint addition part
-- The backup file will be loaded after this preamble

