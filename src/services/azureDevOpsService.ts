// ============================================
// AZURE DEVOPS OAUTH & API SERVICE
// ============================================

import type { AzureDevOpsConfig, AzureDevOpsWorkItem, Feature } from '../types/azure';

// Azure AD Configuration
export const AZURE_AD_CONFIG = {
  clientId: 'a6283b6c-2210-4d6c-bade-651acfdb6703',
  tenantId: '3bb4e039-9a0f-4671-9733-a9ae03d39395',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  scopes: [
    'https://app.vssps.visualstudio.com/user_impersonation',
    'offline_access'
  ]
};

// ============================================
// PKCE HELPER FUNCTIONS
// ============================================

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ============================================
// OAUTH FUNCTIONS
// ============================================

/**
 * Generate OAuth authorization URL with PKCE
 */
export async function getAzureDevOpsAuthUrl(state: string): Promise<string> {
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store verifier for later use
  sessionStorage.setItem('pkce_verifier', codeVerifier);
  
  const params = new URLSearchParams({
    client_id: AZURE_AD_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: AZURE_AD_CONFIG.redirectUri,
    response_mode: 'query',
    scope: AZURE_AD_CONFIG.scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  return `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}/oauth2/v2.0/authorize?${params}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}/oauth2/v2.0/token`;
  
  // Retrieve the code verifier from storage
  const codeVerifier = sessionStorage.getItem('pkce_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found - PKCE flow incomplete');
  }
  
  const params = new URLSearchParams({
    client_id: AZURE_AD_CONFIG.clientId,
    scope: AZURE_AD_CONFIG.scopes.join(' '),
    code: code,
    redirect_uri: AZURE_AD_CONFIG.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Token exchange error:', errorData);
    throw new Error(`Failed to exchange code for tokens: ${errorData.error_description || errorData.error}`);
  }
  
  const data = await response.json();
  
  // Clean up the verifier
  sessionStorage.removeItem('pkce_verifier');
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: AZURE_AD_CONFIG.clientId,
    scope: AZURE_AD_CONFIG.scopes.join(' '),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Token refresh error:', errorData);
    throw new Error(`Failed to refresh access token: ${errorData.error_description || errorData.error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

// Add to azureDevOpsService.ts

export async function fetchStates(config: AzureDevOpsConfig): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  // Get the work item type states
  const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitemtypes/${config.workItemType}?api-version=7.1`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch states: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract state names
  if (data.states && Array.isArray(data.states)) {
    return data.states.map((state: any) => state.name);
  }

  // Fallback to common states if API doesn't return them
  return ['New', 'Active', 'Resolved', 'Closed', 'Removed'];
}

export async function fetchAreaPaths(config: AzureDevOpsConfig): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=7.1`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch area paths: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Recursively extract all area paths
  const extractPaths = (node: any, parentPath: string = ''): string[] => {
    const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
    let paths = [currentPath];
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        paths = paths.concat(extractPaths(child, currentPath));
      });
    }
    
    return paths;
  };

  return extractPaths(data);
}

export async function fetchTags(config: AzureDevOpsConfig): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  try {
    // Simplified query - just get recent work items
    const wiqlQuery = {
      query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.ChangedDate] DESC`
    };

    const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.1`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wiqlQuery)
    });

    if (!response.ok) {
      console.warn('Failed to fetch tags, returning empty array');
      return [];  // Return empty array instead of throwing
    }

    const data = await response.json();
    
    if (!data.workItems || data.workItems.length === 0) {
      return [];
    }

    // Fetch work item details to get tags (limit to 200 items)
    const ids = data.workItems.map((wi: any) => wi.id).slice(0, 200);
    const batchUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.Tags&api-version=7.1`;

    const batchResponse = await fetch(batchUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!batchResponse.ok) {
      console.warn('Failed to fetch work item details for tags');
      return [];
    }

    const workItems = await batchResponse.json();
    
    // Extract and deduplicate tags
    const tagsSet = new Set<string>();
    
    if (workItems.value && Array.isArray(workItems.value)) {
      workItems.value.forEach((item: any) => {
        if (item.fields && item.fields['System.Tags']) {
          const tags = item.fields['System.Tags'].split(';').map((t: string) => t.trim());
          tags.forEach((tag: string) => {
            if (tag) tagsSet.add(tag);
          });
        }
      });
    }

    return Array.from(tagsSet).sort();
  } catch (error) {
    console.warn('Error fetching tags, returning empty array:', error);
    return [];  // Return empty array instead of throwing
  }
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiresAt: string): boolean {
  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expirationTime - now < fiveMinutes;
}

/**
 * Handle OAuth callback from redirect
 */
export async function handleOAuthCallback(): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  // Check if we're on the callback URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  if (!code) {
    return null;
  }
  
  // Verify state matches (you should store this in sessionStorage when initiating OAuth)
  const storedState = sessionStorage.getItem('oauth_state');
  if (state !== storedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }
  
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  
  // Clean up
  sessionStorage.removeItem('oauth_state');
  
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname);
  
  return tokens;
}

/**
 * Initiate OAuth flow
 */
export async function initiateOAuthFlow(): Promise<void> {
  // Generate and store state for CSRF protection
  const state = Math.random().toString(36).substring(7);
  sessionStorage.setItem('oauth_state', state);
  
  // Redirect to authorization URL
  const authUrl = await getAzureDevOpsAuthUrl(state);
  window.location.href = authUrl;
}

/**
 * Ensure we have a valid access token, refresh if needed
 */
export async function ensureValidToken(config: AzureDevOpsConfig): Promise<string> {
  if (!config.accessToken || !config.refreshToken || !config.tokenExpiresAt) {
    throw new Error('Not authenticated');
  }
  
  if (isTokenExpired(config.tokenExpiresAt)) {
    const tokens = await refreshAccessToken(config.refreshToken);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    
    // Return new token and expiration (caller should save to DB)
    return tokens.accessToken;
  }
  
  return config.accessToken;
}

// ============================================
// AZURE DEVOPS API FUNCTIONS
// ============================================

/**
 * Fetch work items from Azure DevOps
 */
export async function fetchAzureDevOpsWorkItems(
  config: AzureDevOpsConfig
): Promise<AzureDevOpsWorkItem[]> {
  const { organization, project, workItemType, query, accessToken } = config;
  
  if (!accessToken) {
    throw new Error('Not authenticated with Azure DevOps');
  }
  
  try {
    // Step 1: Query for work item IDs using WIQL
    const wiqlQuery = query 
      ? `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = '${workItemType}' AND ${query}`
      : `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = '${workItemType}' AND [System.State] = 'Active'`;
    
    const wiqlUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/wiql?api-version=7.0`;
    
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ query: wiqlQuery })
    });
    
    if (!wiqlResponse.ok) {
      throw new Error(`Azure DevOps query failed: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
    }
    
    const wiqlData = await wiqlResponse.json();
    const workItemIds = wiqlData.workItems.map((item: any) => item.id);
    
    if (workItemIds.length === 0) {
      return [];
    }
    
    // Step 2: Get full work item details
    const idsString = workItemIds.slice(0, 200).join(',');
    const fields = [
      'System.Id',
      'System.Title',
      'System.Description',
      'System.Tags',
      'System.WorkItemType',
      'System.State',
      'Microsoft.VSTS.Common.Priority',
      'System.AreaPath',
      'System.IterationPath'
    ].join(',');
    
    const workItemsUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems?ids=${idsString}&fields=${fields}&api-version=7.0`;
    
    const workItemsResponse = await fetch(workItemsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!workItemsResponse.ok) {
      throw new Error(`Failed to fetch work items: ${workItemsResponse.status} ${workItemsResponse.statusText}`);
    }
    
    const workItemsData = await workItemsResponse.json();
    
    // Step 3: Transform the response
    return workItemsData.value.map((item: any) => ({
      id: item.id,
      fields: {
        'System.Title': item.fields['System.Title'],
        'System.Description': item.fields['System.Description'],
        'System.Tags': item.fields['System.Tags'],
        'System.WorkItemType': item.fields['System.WorkItemType'],
        'System.State': item.fields['System.State'],
        'Microsoft.VSTS.Common.Priority': item.fields['Microsoft.VSTS.Common.Priority'],
        'System.AreaPath': item.fields['System.AreaPath'],
        'System.IterationPath': item.fields['System.IterationPath']
      },
      url: `https://dev.azure.com/${organization}/${project}/_workitems/edit/${item.id}`
    }));
    
  } catch (error) {
    console.error('Error fetching from Azure DevOps:', error);
    throw error;
  }
}

/**
 * Convert Azure DevOps work items to Feature format
 */
export function convertWorkItemsToFeatures(workItems: AzureDevOpsWorkItem[]): Feature[] {
  return workItems.map(item => {
    // Extract epic from tags or area path
    let epic = "Uncategorized";
    
    if (item.fields['System.Tags']) {
      const tags = item.fields['System.Tags'].split(';').map(t => t.trim());
      if (tags.length > 0) {
        epic = tags[0];
      }
    } else if (item.fields['System.AreaPath']) {
      const areaPath = item.fields['System.AreaPath'];
      const parts = areaPath.split('\\');
      if (parts.length > 1) {
        epic = parts[parts.length - 1];
      }
    }
    
    return {
      id: `ado-${item.id}`,
      title: item.fields['System.Title'] || 'Untitled',
    description: item.fields['System.Description'] || '',
    epic: item.fields['System.AreaPath'] || null,
    state: item.fields['System.State'] || null,                    // ADD THIS
    areaPath: item.fields['System.AreaPath'] || null,             // ADD THIS
    tags: item.fields['System.Tags']                               // ADD THIS
      ? item.fields['System.Tags'].split(';').map((t: string) => t.trim()).filter((t: string) => t)
      : [],
      azureDevOpsId: item.id.toString(),
      azureDevOpsUrl: item.url
    };
  });
}

/**
 * Get Azure AD configuration (for external reference)
 */
export function getAzureAdConfig() {
  return {
    clientId: AZURE_AD_CONFIG.clientId,
    tenantId: AZURE_AD_CONFIG.tenantId
  };
}
