// Utility helpers for identifying fallback system admins
const defaultFallbackAdmins = ['dave.hoffman@newmill.com'];

const envFallbackAdmins = (import.meta.env.VITE_FALLBACK_SYSTEM_ADMIN_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const rawFallbackAdmins = Array.from(new Set([...defaultFallbackAdmins, ...envFallbackAdmins]));

export function isFallbackSystemAdmin(email?: string | null): boolean {
  if (!email) return false;
  return rawFallbackAdmins.includes(email.toLowerCase());
}

export function getFallbackSystemAdminEmails(): string[] {
  return rawFallbackAdmins;
}

