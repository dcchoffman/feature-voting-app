import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://okdzllfpsvltjqryslnn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZHpsbGZwc3ZsdGpxcnlzbG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTcxMTgsImV4cCI6MjA3NTMzMzExOH0.uLhMzo49-OMEp4ghFAFI31IpiDs1tjbyY2jZlk-vgUo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
