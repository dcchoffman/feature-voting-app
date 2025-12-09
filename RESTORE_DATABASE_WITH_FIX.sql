-- Fixed Database Restore Script
-- This script fixes the constraint conflict issue before restoring

-- Step 1: Drop existing constraints that might conflict
DO $$
BEGIN
    -- Drop azure_devops_config constraints if they exist
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_pkey CASCADE;
    
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_session_id_key CASCADE;
    
    ALTER TABLE IF EXISTS public.azure_devops_config 
        DROP CONSTRAINT IF EXISTS azure_devops_config_session_id_fkey CASCADE;
    
    RAISE NOTICE 'Dropped existing azure_devops_config constraints';
END $$;

-- Step 2: Now you can safely run the backup file
-- The backup file will recreate the constraints

-- IMPORTANT: After running this script, run the backup file:
-- backups\database_backup_20251204_095813.sql

