// EmailJS Configuration - these should match your EmailJS setup
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_idsx5cg';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_4owif48';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'OXfL2jaTJuDR5IThS';

export interface SendInvitePayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendInvitationEmail(payload: SendInvitePayload): Promise<void> {
  try {
    // EmailJS must be called from the client-side (browser)
    // This is by design for security reasons
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          email: payload.to, // Match the template variable {{email}}
          to_email: payload.to, // Keep for compatibility
          to_name: payload.to.split('@')[0], // Extract name from email
          subject: payload.subject,
          message_html: payload.html || payload.text || '',
          message_text: payload.text || payload.html?.replace(/<[^>]*>/g, '') || '',
          // Note: from_email and from_name should be set in EmailJS template settings
          // to match the authenticated Outlook account, or use template variables if supported
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EmailJS API error:', response.status, errorText);
      
      let errorMessage = `EmailJS API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.text) {
          errorMessage = errorJson.text;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    // EmailJS sometimes returns "OK" as plain text instead of JSON
    let result;
    try {
      const responseText = await response.text();
      if (responseText === 'OK' || responseText.trim() === 'OK') {
        // Success - EmailJS returned plain text "OK"
        console.log('Email sent successfully via EmailJS');
        return;
      }
      // Try to parse as JSON
      result = JSON.parse(responseText);
      console.log('Email sent successfully via EmailJS:', result);
    } catch (parseError) {
      // If parsing fails but we got a 200 status, assume success
      if (response.ok) {
        console.log('Email sent successfully via EmailJS (non-JSON response)');
        return;
      }
      throw parseError;
    }
    return;
  } catch (err: any) {
    console.error('sendInvitationEmail error:', err);
    if (err.message) {
      throw err;
    }
    throw new Error(`Failed to send email: ${err.toString()}`);
  }
}


