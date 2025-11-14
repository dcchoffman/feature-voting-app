// ============================================
// teamsAuth.ts - Teams SSO Authentication Helper
// ============================================
// Location: src/utils/teamsAuth.ts
// ============================================

import * as microsoftTeams from '@microsoft/teams-js';

/**
 * Get Teams SSO token
 * This will prompt the user for consent if needed
 */
export const getTeamsAuthToken = async (): Promise<string | null> => {
  try {
    console.log('🔐 Requesting Teams SSO token...');
    
    const token = await microsoftTeams.authentication.getAuthToken({
      resources: [
        `api://dcchoffman.github.io/a6283b6c-2210-4d6c-bade-651acfdb6703`
      ],
      silent: false
    });
    
    console.log('✅ Teams SSO token received');
    return token;
  } catch (error) {
    console.error('❌ Teams SSO error:', error);
    return null;
  }
};

/**
 * Decode JWT token to get user info
 */
export const decodeTeamsToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get user email from Teams context or token
 */
export const getTeamsUserEmail = async (): Promise<string | null> => {
  try {
    const context = await microsoftTeams.app.getContext();
    return context.user?.userPrincipalName || null;
  } catch (error) {
    console.error('Error getting Teams user email:', error);
    return null;
  }
};

/**
 * Check if running in Teams
 */
export const isInTeams = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('inTeams') === 'true' || window.parent !== window;
};