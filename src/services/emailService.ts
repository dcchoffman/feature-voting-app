import { supabase } from '../supabaseClient';

export interface SendInvitePayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendInvitationEmail(payload: SendInvitePayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-invitation-email', {
    body: payload
  });
  if (error) {
    throw error;
  }
}


