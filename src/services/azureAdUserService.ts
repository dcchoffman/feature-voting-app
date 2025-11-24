// ============================================
// Azure AD User Search Service
// ============================================
// Location: src/services/azureAdUserService.ts
// ============================================

import { supabase } from '../supabaseClient';

export interface AzureAdUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
}

/**
 * Search Azure AD users by name or email
 * Uses Microsoft Graph API with the current user's access token
 */
export async function searchAzureAdUsers(searchTerm: string): Promise<AzureAdUser[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    // Get the current user's session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw new Error('Unable to access your session. Please sign in again.');
    }
    
    if (!session) {
      console.warn('No session available for Azure AD search');
      throw new Error('You must be signed in to search company users.');
    }

    // Check if user signed in with Azure AD
    const isAzureProvider = session.user?.app_metadata?.provider === 'azure' || 
                           session.user?.identities?.some((id: any) => id.provider === 'azure');
    
    if (!isAzureProvider) {
      console.warn('User not signed in with Azure AD');
      throw new Error('You must sign in with Microsoft to search company users.');
    }

    // Try to get the provider token (Microsoft Graph token) from the session
    // Supabase stores provider tokens in the session's provider_token field
    // For Azure AD, we need the Microsoft Graph access token
    const providerToken = session.provider_token || session.access_token;
    
    if (!providerToken) {
      console.warn('No provider token available for Azure AD search');
      throw new Error('Unable to access Microsoft Graph. Please sign out and sign in again with Microsoft.');
    }

    // Use Microsoft Graph API to search users
    // $search requires beta endpoint and specific format
    // Using $filter for broader compatibility
    const searchQuery = searchTerm.trim();
    const filter = `startswith(displayName,'${searchQuery}') or startswith(mail,'${searchQuery}') or startswith(userPrincipalName,'${searchQuery}') or startswith(givenName,'${searchQuery}') or startswith(surname,'${searchQuery}')`;
    
    // Note: $orderby is not supported with $filter using startswith, so we'll sort the results client-side
    const graphUrl = `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=id,displayName,mail,userPrincipalName,givenName,surname,jobTitle,department&$top=20`;
    
    const response = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = '';
      
      // If 401, token might not have the right permissions or might not be a Graph token
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please sign out and sign in again with Microsoft.';
        console.warn('Azure AD search 401:', errorText);
      }
      // If 403, user doesn't have permission to read other users
      else if (response.status === 403) {
        errorMessage = 'Your Azure AD app needs "User.ReadBasic.All" or "User.Read.All" permission to search users. An administrator must grant this permission in Azure Portal.';
        console.warn('Azure AD search 403 - Insufficient permissions:', errorText);
      }
      // If 400, might be a bad request (e.g., invalid filter)
      else if (response.status === 400) {
        errorMessage = 'Invalid search query. Please try a different search term.';
        console.warn('Azure AD search 400:', errorText);
      }
      else {
        errorMessage = `Unable to search users (${response.status}). Please try again.`;
        console.error('Azure AD search error:', response.status, errorText);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    // Sort results client-side since $orderby is not supported with $filter using startswith
    const users = (data.value || []).map((user: any) => ({
      id: user.id,
      displayName: user.displayName || '',
      mail: user.mail || user.userPrincipalName || '',
      userPrincipalName: user.userPrincipalName || '',
      givenName: user.givenName,
      surname: user.surname,
      jobTitle: user.jobTitle,
      department: user.department
    }));
    
    // Sort by displayName alphabetically
    return users.sort((a: AzureAdUser, b: AzureAdUser) => {
      const nameA = a.displayName.toLowerCase();
      const nameB = b.displayName.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } catch (error: any) {
    console.error('Error searching Azure AD users:', error);
    // Re-throw the error so the UI can display it
    throw error;
  }
}

