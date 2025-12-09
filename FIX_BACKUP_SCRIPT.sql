-- Quick fix for the backup restore issue
-- Run this BEFORE running the full backup restore
-- This drops the conflicting constraint

DO $$
BEGIN
    -- Drop the primary key constraint if it exists
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_pkey;
    
    RAISE NOTICE 'Dropped existing azure_devops_config_pkey constraint if it existed';
END $$;

-- Now you can run the backup file

