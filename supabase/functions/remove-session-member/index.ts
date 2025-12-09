// Supabase Edge Function to remove stakeholders or product owners from sessions
// This function uses the service role to bypass RLS policies
// It verifies that the requester is a product owner for the sessions they're modifying

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RemoveSessionMemberRequest {
  productId: string; // Product ID (product-level assignment)
  roleType: 'stakeholder' | 'product-owner';
  userEmail: string;
  userId?: string; // Required for product-owner, optional for stakeholder
  requesterEmail?: string; // For email/password users who don't have JWT tokens
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
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

    // Parse request body first (we need it for both auth methods)
    const payload: RemoveSessionMemberRequest = await req.json();
    
    // Get the authorization header to verify the requester
    const authHeader = req.headers.get('authorization');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    let userId: string | null = null;
    
    // Try to get user from JWT token (for Supabase Auth users)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const userSupabase = createClient(supabaseUrl, anonKey, {
          global: {
            headers: { Authorization: authHeader }
          }
        });

        const { data: { user }, error: userError } = await userSupabase.auth.getUser();
        if (!userError && user) {
          userId = user.id;
        }
      } catch (e) {
        console.warn('[remove-session-member] Failed to get user from JWT:', e);
      }
    }
    
    // If no user from JWT, try to get user from request body (for email/password users)
    if (!userId) {
      console.log('[remove-session-member] No JWT token, checking for requesterEmail in payload:', {
        hasRequesterEmail: !!payload.requesterEmail,
        requesterEmail: payload.requesterEmail,
        payloadKeys: Object.keys(payload)
      });
      
      if (payload.requesterEmail) {
        // Look up user by email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', payload.requesterEmail.toLowerCase())
          .maybeSingle();
        
        console.log('[remove-session-member] User lookup result:', {
          found: !!userData,
          userId: userData?.id,
          error: userError?.message
        });
        
        if (!userError && userData) {
          userId = userData.id;
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'Unable to verify user identity',
              details: userError?.message || 'User not found',
              requesterEmail: payload.requesterEmail
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Missing authorization. Please provide either a JWT token or requesterEmail in the request body.',
            receivedPayload: Object.keys(payload)
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unable to determine user identity' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[remove-session-member] Authenticated user ID:', userId);

    if (!payload.productId) {
      return new Response(
        JSON.stringify({ error: 'Missing productId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.roleType || !['stakeholder', 'product-owner'].includes(payload.roleType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid roleType. Must be "stakeholder" or "product-owner"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.userEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing userEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.roleType === 'product-owner' && !payload.userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required for product-owner role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requester is a product owner for all the sessions they're trying to modify
    // Check if user is a system admin first (system admins can manage all sessions)
    // Use service role client to bypass RLS for permission checks
    const { data: systemAdminCheck } = await supabase
      .from('users')
      .select('is_system_admin')
      .eq('id', userId)
      .maybeSingle();

    const isSystemAdmin = systemAdminCheck?.is_system_admin === true;

    if (!isSystemAdmin) {
      // Check if user is a Product Owner for the requested product
      const { data: productOwnerCheck, error: productOwnerError } = await supabase
        .from('product_product_owners')
        .select('product_id')
        .eq('user_id', userId)
        .eq('product_id', payload.productId)
        .maybeSingle();

      if (productOwnerError) {
        throw productOwnerError;
      }

      if (!productOwnerCheck) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to manage this product' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user ID for product-owner role if not provided
    let targetUserId: string | undefined;
    if (payload.roleType === 'product-owner') {
      if (payload.userId) {
        targetUserId = payload.userId;
      } else {
        // Get user by email
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', payload.userEmail.toLowerCase())
          .single();

        if (existingUser) {
          targetUserId = existingUser.id;
        } else {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Remove members from product using service role (bypasses RLS)
    if (payload.roleType === 'product-owner') {
      if (!targetUserId) {
        throw new Error('userId is required for product-owner role');
      }
      const { error } = await supabase
        .from('product_product_owners')
        .delete()
        .eq('product_id', payload.productId)
        .eq('user_id', targetUserId);

      // Ignore errors if the record doesn't exist
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully removed ${payload.roleType} from product`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Stakeholder
      const { error } = await supabase
        .from('product_stakeholders')
        .delete()
        .eq('product_id', payload.productId)
        .eq('user_email', payload.userEmail.toLowerCase());

      // Ignore errors if the record doesn't exist
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully removed ${payload.roleType} from product`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error removing session member:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to remove session member' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

