// Utility to generate secure tokens for grant access links
// This matches the token generation in the Supabase Edge Function

export async function generateGrantAccessToken(
  email: string,
  productId: string,
  action: 'grant-admin' | 'grant-stakeholder'
): Promise<string> {
  // Use a secret that matches the Edge Function
  // In production, this should be stored securely or generated server-side
  const secret = 'default-secret-change-in-production'; // Should match GRANT_ACCESS_SECRET in Edge Function
  const data = `${email}:${productId}:${action}:${secret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // Use first 32 chars as token
}

