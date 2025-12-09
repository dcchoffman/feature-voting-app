// Supabase Edge Function to delete a user (bypasses RLS using service role)
// This function uses the service role to bypass RLS policies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteUserRequest {
  userId: string;
  currentUserId: string; // The user performing the deletion (must be system admin)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Get Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId, currentUserId }: DeleteUserRequest = await req.json();

    if (!userId || !currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, currentUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify current user is a system admin
    const { data: systemAdminCheck, error: adminCheckError } = await supabase
      .from('system_admins')
      .select('user_id')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (adminCheckError) {
      throw adminCheckError;
    }

    if (!systemAdminCheck) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only system admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info before deletion
    const { data: userToDelete } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle();

    if (!userToDelete) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove from all products (product-level)
    // Remove as Product Owner
    await supabase
      .from('product_product_owners')
      .delete()
      .eq('user_id', userId);

    // Remove as Stakeholder (by email)
    await supabase
      .from('product_stakeholders')
      .delete()
      .eq('user_email', userToDelete.email.toLowerCase());

    // Remove system admin role if applicable
    await supabase
      .from('system_admins')
      .delete()
      .eq('user_id', userId);

    // Delete the user record
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${userToDelete.name || userToDelete.email} has been deleted successfully`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

