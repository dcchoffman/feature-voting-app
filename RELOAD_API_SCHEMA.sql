-- Force PostgREST to reload schema
-- This notifies PostgREST that the schema has changed

NOTIFY pgrst, 'reload schema';

-- Alternative: You can also run this
SELECT pg_notify('pgrst', 'reload schema');
