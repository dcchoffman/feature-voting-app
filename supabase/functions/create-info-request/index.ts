// Supabase Edge Function to create info requests and send emails
// This function uses the service role to bypass RLS policies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateInfoRequestPayload {
  session_id: string;
  feature_id: string;
  feature_title: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  session_name?: string;
  feature_description?: string;
}

// Note: We use the send-invitation-email Edge Function to send emails
// This avoids EmailJS blocking server-side API calls

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

    // Parse request body
    const payload: CreateInfoRequestPayload = await req.json();

    if (!payload.session_id || !payload.feature_id || !payload.feature_title || 
        !payload.requester_id || !payload.requester_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the info request in the database (bypasses RLS)
    const { data: infoRequest, error: insertError } = await supabase
      .from('info_requests')
      .insert([{
        session_id: payload.session_id,
        feature_id: payload.feature_id,
        feature_title: payload.feature_title,
        requester_id: payload.requester_id,
        requester_name: payload.requester_name || '',
        requester_email: payload.requester_email,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating info request:', insertError);
      throw insertError;
    }

    // Get session admins for the current session
    const { data: sessionAdminsData, error: adminsError } = await supabase
      .from('session_admins')
      .select(`
        *,
        users (*)
      `)
      .eq('session_id', payload.session_id);

    if (adminsError) {
      console.error('Error fetching session admins:', adminsError);
      // Don't fail the request if we can't get admins - the request was saved
    }

    console.log(`Found ${sessionAdminsData?.length || 0} session admin(s) for session ${payload.session_id}`);

    // Get admin emails to return to client for email sending
    // Emails must be sent from client-side because EmailJS blocks server-side calls
    const adminEmails: string[] = [];
    if (sessionAdminsData && sessionAdminsData.length > 0) {
      sessionAdminsData.forEach((admin: any) => {
        if (admin.users && admin.users.email) {
          adminEmails.push(admin.users.email);
        }
      });
    }

    console.log(`Returning ${adminEmails.length} admin email(s) for client-side sending`);

    // Prepare email content for client-side sending
    // Note: The actual URL will be constructed on the client-side since we don't know the origin here
    const requesterName = payload.requester_name || payload.requester_email.split('@')[0] || 'A stakeholder';
    const sessionName = payload.session_name || 'this voting session';
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    const escapedTitle = escapeHtml(payload.feature_title);
    const escapedDescription = payload.feature_description ? escapeHtml(payload.feature_description).replace(/\n/g, '<br />') : '';
    const escapedRequesterName = escapeHtml(requesterName);
    const escapedSessionName = escapeHtml(sessionName);
    
    const emailContent = {
      subject: `Information Request: ${payload.feature_title}`,
      sessionId: payload.session_id,
      featureId: payload.feature_id,
      html: `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; font-family: Arial, sans-serif;">
  <tr>
    <td align="center" style="padding: 48px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
        <!-- Logo Header -->
        <tr>
          <td style="background-color: #ffffff; padding: 32px 40px 24px 40px; text-align: center;">
            <img src="https://dcchoffman.github.io/feature-voting-app/New-Millennium-color-logo1.png" alt="New Millennium Building Systems" width="300" height="96" style="height: 96px; width: auto; max-width: 300px; display: block; margin: 0 auto; border: 0;" />
            <div style="font-size: 24px; font-weight: bold; color: #2d4660; margin-top: 16px;">Information Request</div>
          </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
          <td style="background-color: #ffffff; padding: 40px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Hello,</p>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #333; line-height: 1.6;"><strong style="color: #2d4660;">${escapedRequesterName}</strong> has requested more information about the following feature in the voting session "<strong style="color: #2d4660;">${escapedSessionName}</strong>":</p>
            
            <!-- Feature Details Box -->
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #2d4660;">
              <h3 style="color: #2d4660; margin: 0 0 12px 0; font-size: 18px; font-weight: bold;">${escapedTitle}</h3>
              ${escapedDescription ? `<p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">${escapedDescription}</p>` : '<p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">No description provided.</p>'}
            </div>
            
            <p style="margin: 24px 0; font-size: 16px; color: #333; line-height: 1.6;">Please provide additional information about this feature to help ${escapedRequesterName} make an informed voting decision.</p>
            
            <!-- Admin Dashboard Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="{{ADMIN_DASHBOARD_URL}}" style="display: inline-block; padding: 12px 24px; background-color: #C89212; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">Go to Admin Dashboard</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; position: relative;">
            <p style="margin: 0 0 8px 0;">This is an automated message from the Feature Voting System.</p>
            <p style="margin: 0; color: #9ca3af;">© ${new Date().getFullYear()} New Millennium Building Systems</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
      text: `
Information Request - Feature Voting System

Hello,

${requesterName} has requested more information about the following feature in the voting session "${sessionName}":

${payload.feature_title}
${payload.feature_description || 'No description provided.'}

Please provide additional information about this feature to help ${requesterName} make an informed voting decision.

Go to Admin Dashboard: {{ADMIN_DASHBOARD_URL}}

This is an automated message from the Feature Voting System.
      `
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Info request created successfully',
        infoRequest: infoRequest,
        adminEmails: adminEmails,
        emailContent: emailContent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating info request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create info request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

