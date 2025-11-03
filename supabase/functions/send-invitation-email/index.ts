// Supabase Edge Function: send-invitation-email
// Env required: RESEND_API_KEY, FROM_EMAIL (or use Resend domain)
// Resend free tier: 3,000 emails/month, 100 emails/day

// deno-lint-ignore no-explicit-any
function jsonResponse(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    ...init
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL');

  if (!resendApiKey || !fromEmail) {
    return jsonResponse({ error: 'Missing RESEND_API_KEY or FROM_EMAIL' }, { status: 500 });
  }

  let payload: { to?: string; subject?: string; text?: string; html?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const to = (payload.to || '').trim();
  const subject = (payload.subject || '').trim();
  const text = (payload.text || '').trim();
  const html = (payload.html || '').trim();

  if (!to || !subject || (!text && !html)) {
    return jsonResponse({ error: 'to, subject, and text or html are required' }, { status: 400 });
  }

  const resendBody = {
    from: fromEmail,
    to: [to],
    subject,
    ...(text ? { text } : {}),
    ...(html ? { html } : {})
  };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resendBody)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return jsonResponse({ error: 'Failed to send email', status: resp.status, detail: errText }, { status: 502 });
  }

  return jsonResponse({ success: true });
});


