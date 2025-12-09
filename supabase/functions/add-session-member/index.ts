// Supabase Edge Function to add stakeholders or product owners to sessions
// This function uses the service role to bypass RLS policies
// It verifies that the requester is a product owner for the sessions they're modifying

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AddSessionMemberRequest {
  productId: string; // Product ID (product-level assignment)
  roleType: 'stakeholder' | 'product-owner';
  userEmail: string;
  userName: string;
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
    const payload: AddSessionMemberRequest = await req.json();
    
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
        console.warn('[add-session-member] Failed to get user from JWT:', e);
      }
    }
    
    // If no user from JWT, try to get user from request body (for email/password users)
    if (!userId) {
      if (payload.requesterEmail) {
        // Look up user by email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', payload.requesterEmail.toLowerCase())
          .maybeSingle();
        
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

    // Get or create user for product-owner role
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
          // Create user if it doesn't exist
          const fallbackName = payload.userName || payload.userEmail.split('@')[0].replace(/\./g, ' ');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{ 
              email: payload.userEmail.toLowerCase(), 
              name: fallbackName 
            }])
            .select('id')
            .single();

          if (createError) {
            // If duplicate, try to fetch again
            if (createError.code === '23505') {
              const { data: fetchedUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', payload.userEmail.toLowerCase())
                .single();
              if (fetchedUser) {
                targetUserId = fetchedUser.id;
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          } else {
            targetUserId = newUser.id;
          }
        }
      }
    }

    // For stakeholders, ensure the user exists in the users table
    let stakeholderUserId: string | undefined;
    if (payload.roleType === 'stakeholder') {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', payload.userEmail.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        stakeholderUserId = existingUser.id;
      } else {
        // Create user if it doesn't exist
        const fallbackName = payload.userName || payload.userEmail.split('@')[0].replace(/\./g, ' ');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ 
            email: payload.userEmail.toLowerCase(), 
            name: fallbackName 
          }])
          .select('id')
          .single();

        if (createError) {
          // If duplicate, try to fetch again
          if (createError.code === '23505') {
            const { data: fetchedUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', payload.userEmail.toLowerCase())
              .single();
            if (fetchedUser) {
              stakeholderUserId = fetchedUser.id;
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        } else {
          stakeholderUserId = newUser.id;
        }
      }
    }

    // Add members to product using service role (bypasses RLS)
    if (payload.roleType === 'product-owner') {
      if (!targetUserId) {
        throw new Error('userId is required for product-owner role');
      }
      const { data, error } = await supabase
        .from('product_product_owners')
        .insert([{ 
          product_id: payload.productId, 
          user_id: targetUserId 
        }])
        .select()
        .single();

      // Ignore duplicate key errors (user already Product Owner for this product)
      if (error && error.code !== '23505') {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully added ${payload.roleType} to product`,
          data,
          userId: targetUserId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Stakeholder
      const { data, error } = await supabase
        .from('product_stakeholders')
        .insert([{
          product_id: payload.productId,
          user_email: payload.userEmail.toLowerCase(),
          user_name: payload.userName || payload.userEmail.split('@')[0].replace(/\./g, ' '),
          votes_allocated: 10,
          has_voted: false
        }])
        .select()
        .single();

      // Ignore duplicate key errors (user already stakeholder for this product)
      if (error && error.code !== '23505') {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully added ${payload.roleType} to product`,
          data,
          userId: stakeholderUserId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error adding session member:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to add session member' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

