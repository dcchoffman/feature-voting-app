-- Simple script to just create the users table
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by_name text,
    created_by uuid,
    tenant_id uuid
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a simple permissive policy
CREATE POLICY "Allow all for authenticated users" 
ON public.users 
FOR ALL
TO authenticated 
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
