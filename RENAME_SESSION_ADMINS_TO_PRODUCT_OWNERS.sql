-- Migration script to rename session_admins table to product_owners
-- This aligns the database schema with the code changes that replaced "Session Admin" with "Product Owner"

DO $$
BEGIN
    -- Step 1: Drop existing RLS policies (they will be recreated with new names)
    DROP POLICY IF EXISTS "Anyone can read session admins" ON public.session_admins;
    DROP POLICY IF EXISTS "Authenticated users can access session admins" ON public.session_admins;
    DROP POLICY IF EXISTS "Authenticated users can manage session admins" ON public.session_admins;
    DROP POLICY IF EXISTS "Users can add themselves as session admins" ON public.session_admins;
    
    -- Step 2: Drop existing constraints (they will be recreated with new names)
    ALTER TABLE IF EXISTS public.session_admins 
        DROP CONSTRAINT IF EXISTS session_admins_pkey;
    ALTER TABLE IF EXISTS public.session_admins 
        DROP CONSTRAINT IF EXISTS session_admins_session_id_user_id_key;
    ALTER TABLE IF EXISTS public.session_admins 
        DROP CONSTRAINT IF EXISTS session_admins_session_id_fkey;
    ALTER TABLE IF EXISTS public.session_admins 
        DROP CONSTRAINT IF EXISTS session_admins_user_id_fkey;
    
    -- Step 3: Rename the table
    ALTER TABLE IF EXISTS public.session_admins 
        RENAME TO product_owners;
    
    -- Step 4: Recreate constraints with new names
    ALTER TABLE public.product_owners 
        ADD CONSTRAINT product_owners_pkey PRIMARY KEY (id);
    
    ALTER TABLE public.product_owners 
        ADD CONSTRAINT product_owners_session_id_user_id_key UNIQUE (session_id, user_id);
    
    ALTER TABLE public.product_owners 
        ADD CONSTRAINT product_owners_session_id_fkey 
        FOREIGN KEY (session_id) 
        REFERENCES public.voting_sessions(id) 
        ON DELETE CASCADE;
    
    ALTER TABLE public.product_owners 
        ADD CONSTRAINT product_owners_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    
    -- Step 5: Recreate RLS policies with updated names
    CREATE POLICY "Anyone can read product owners" ON public.product_owners
        FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can access product owners" ON public.product_owners
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Authenticated users can manage product owners" ON public.product_owners
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can add themselves as product owners" ON public.product_owners
        FOR INSERT
        WITH CHECK (
            auth.role() = 'authenticated' 
            OR EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = product_owners.user_id
            )
        );
    
    -- Step 6: Update grants (drop old, add new)
    REVOKE ALL ON TABLE public.product_owners FROM anon;
    REVOKE ALL ON TABLE public.product_owners FROM authenticated;
    REVOKE ALL ON TABLE public.product_owners FROM service_role;
    
    GRANT ALL ON TABLE public.product_owners TO anon;
    GRANT ALL ON TABLE public.product_owners TO authenticated;
    GRANT ALL ON TABLE public.product_owners TO service_role;
    
    RAISE NOTICE 'Successfully renamed session_admins table to product_owners';
END $$;

