// Supabase Edge Function to grant access without requiring user authentication
// This function uses the service role to bypass RLS policies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GrantAccessRequest {
  token: string;
  action: 'grant-admin' | 'grant-stakeholder';
  email: string;
  productId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const { token, action, email, productId }: GrantAccessRequest = await req.json();

    if (!token || !action || !email || !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token (simple verification - in production, use a more secure method)
    // For now, we'll use a simple hash verification
    // In a real implementation, you'd store tokens in a database table with expiration
    const expectedToken = await generateToken(email, productId, action);
    if (token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create user
    const fallbackName = email.split('@')[0].replace(/\./g, ' ');
    
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ email: email.toLowerCase(), name: fallbackName }])
        .select()
        .maybeSingle();

      if (createError) {
        // If it's a duplicate key error, try to fetch the user again
        if (createError.code === '23505') {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();
          if (existingUser) {
            user = existingUser;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        user = newUser;
      }
    }

    // Grant access at product level
    if (action === 'grant-admin') {
      const { data, error } = await supabase
        .from('product_product_owners')
        .insert([{ product_id: productId, user_id: user.id }])
        .select();
      
      // Ignore duplicate key errors (user already Product Owner for this product)
      if (error && error.code !== '23505') {
        throw error;
      }
    } else {
      const { data, error } = await supabase
        .from('product_stakeholders')
        .insert([{
          product_id: productId,
          user_email: email.toLowerCase(),
          user_name: user.name,
          votes_allocated: 10,
          has_voted: false
        }])
        .select();
      
      // Ignore duplicate key errors (user already Stakeholder for this product)
      if (error && error.code !== '23505') {
        throw error;
      }
    }

    // Get product name
    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully granted ${action === 'grant-admin' ? 'Product Owner' : 'Stakeholder'} access`,
        productName: product?.name || 'the product'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error granting access:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to grant access' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate a token based on email, productId, and action
// In production, use a more secure method (e.g., JWT with secret)
async function generateToken(email: string, productId: string, action: string): Promise<string> {
  const secret = Deno.env.get('GRANT_ACCESS_SECRET') || 'default-secret-change-in-production';
  const data = `${email}:${productId}:${action}:${secret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // Use first 32 chars as token
}

