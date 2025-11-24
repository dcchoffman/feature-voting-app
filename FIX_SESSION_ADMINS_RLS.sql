-- Fix RLS policy for session_admins table to allow inserts
-- This fixes the issue where adding a session admin fails with RLS violation

DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can read session admins" ON public.session_admins;
    DROP POLICY IF EXISTS "Authenticated users can write session admins" ON public.session_admins;
    
    -- Allow anyone to read (needed for checking roles)
    CREATE POLICY "Anyone can read session admins" ON public.session_admins
        FOR SELECT
        USING (true);
    
    -- Allow inserts for authenticated users OR if user_id exists in users table
    -- This handles both OAuth (authenticated role) and email/name login (anon role)
    CREATE POLICY "Users can add themselves as session admins" ON public.session_admins
        FOR INSERT
        WITH CHECK (
            auth.role() = 'authenticated' 
            OR EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = session_admins.user_id
            )
        );
    
    -- Allow updates/deletes for authenticated users
    CREATE POLICY "Authenticated users can manage session admins" ON public.session_admins
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
END $$;

