// Supabase Edge Function: send-invitation-email
// This function sends emails using EmailJS (no DNS verification required)
// Deploy with: supabase functions deploy send-invitation-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// EmailJS Configuration
const EMAILJS_SERVICE_ID = Deno.env.get('EMAILJS_SERVICE_ID')
const EMAILJS_TEMPLATE_ID = Deno.env.get('EMAILJS_TEMPLATE_ID')
const EMAILJS_PUBLIC_KEY = Deno.env.get('EMAILJS_PUBLIC_KEY')
const EMAILJS_USER_ID = Deno.env.get('EMAILJS_USER_ID') || EMAILJS_PUBLIC_KEY // User ID is the same as Public Key

interface EmailPayload {
  to: string
  subject: string
  text?: string
  html?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { to, subject, text, html } = payload

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send email via EmailJS
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'EmailJS not configured. Please set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in Supabase Dashboard → Settings → Edge Functions → Secrets.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // EmailJS API call
    // Note: EmailJS uses template_params for dynamic content
    // We'll send both HTML and text, and the template can use whichever is available
    const emailjsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,
        template_params: {
          to_email: to,
          to_name: to.split('@')[0], // Extract name from email
          subject: subject,
          message_html: html || text || '',
          message_text: text || html?.replace(/<[^>]*>/g, '') || '',
          reply_to: EMAILJS_USER_ID, // Use your EmailJS account email as reply-to
        },
      }),
    })

    if (!emailjsResponse.ok) {
      const errorText = await emailjsResponse.text()
      console.error('EmailJS API error:', emailjsResponse.status, errorText)
      
      // Parse error to provide better message
      let errorMessage = `EmailJS API error: ${emailjsResponse.status}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.text) {
          errorMessage = errorJson.text
        } else if (errorJson.message) {
          errorMessage = errorJson.message
        } else if (errorJson.error) {
          errorMessage = errorJson.error
        }
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          statusCode: emailjsResponse.status,
          details: errorText
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await emailjsResponse.json()
    console.log('Email sent successfully via EmailJS:', result)
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', result }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error sending email:', error)
    const errorMessage = error?.message || error?.toString() || 'Failed to send email'
    console.error('Full error details:', JSON.stringify(error, null, 2))
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error?.stack || error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


