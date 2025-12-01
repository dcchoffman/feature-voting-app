// ============================================
// AZURE DEVOPS OAUTH & API SERVICE
// ============================================

import type { AzureDevOpsConfig, AzureDevOpsWorkItem, Feature } from '../types/azure';

export const WORK_ITEM_TYPES = [
  'Bug',
  'Change Request',
  'Data Correction',
  'Epic',
  'Feature',
  'Group',
  'Issue',
  'Other',
  'Spike',
  'Task',
  'Test Case',
  'User Story'
];

// Helper function to get the correct redirect URI based on environment
function getRedirectUri(): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  
  // Extract the base path (everything before /admin or /voter)
  const basePath = pathname.includes('/admin') 
    ? pathname.substring(0, pathname.indexOf('/admin'))
    : pathname.includes('/voter')
    ? pathname.substring(0, pathname.indexOf('/voter'))
    : pathname;
  
  // Construct the full redirect URI
  return `${origin}${basePath}/admin`;
}

// Azure AD Configuration
export const AZURE_AD_CONFIG = {
  clientId: 'a6283b6c-2210-4d6c-bade-651acfdb6703',
  tenantId: '3bb4e039-9a0f-4671-9733-a9ae03d39395',
  get redirectUri(): string {
    return getRedirectUri();
  },
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

export async function fetchStates(config: AzureDevOpsConfig, workItemType?: string): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  const targetWorkItemType = workItemType || config.workItemType;
  if (!targetWorkItemType) {
    throw new Error('Missing work item type for state fetch');
  }

  const encodedType = encodeURIComponent(targetWorkItemType);
  const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitemtypes/${encodedType}?api-version=7.1`;

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

  if (data.states && Array.isArray(data.states)) {
    return data.states.map((state: any) => state.name);
  }

  return [];
}

export async function fetchAllStates(config: AzureDevOpsConfig): Promise<string[]> {
  const statesSet = new Set<string>();

  for (const workItemType of WORK_ITEM_TYPES) {
    try {
      const states = await fetchStates({ ...config, workItemType }, workItemType);
      states.forEach(state => {
        if (state) {
          statesSet.add(state);
        }
      });
    } catch (error) {
      console.warn(`Failed to fetch states for type ${workItemType}:`, error);
    }
  }

  return Array.from(statesSet).sort((a, b) => a.localeCompare(b));
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

export async function fetchAreaPathsForTypeAndStates(
  config: AzureDevOpsConfig,
  workItemType?: string,
  states: string[] = []
): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  // If no specific work item type provided, fall back to full area path list
  if (!workItemType) {
    return fetchAreaPaths(config);
  }

  try {
    const conditions: string[] = [`[System.WorkItemType] = '${workItemType}'`];

    if (states && states.length > 0) {
      if (states.length === 1) {
        conditions.push(`[System.State] = '${states[0]}'`);
      } else {
        const statesList = states.map(state => `'${state}'`).join(', ');
        conditions.push(`[System.State] IN (${statesList})`);
      }
    }

    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(' AND ')} ORDER BY [System.ChangedDate] DESC`;

    const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.1`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: wiqlQuery })
    });

    if (!response.ok) {
      console.warn('Failed to fetch area paths by type/state, returning empty list');
      return [];
    }

    const data = await response.json();

    if (!data.workItems || data.workItems.length === 0) {
      return [];
    }

    const ids = data.workItems.map((wi: any) => wi.id).slice(0, 200);
    if (ids.length === 0) {
      return [];
    }

    const batchUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.AreaPath,System.TeamProject&api-version=7.1`;

    const batchResponse = await fetch(batchUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!batchResponse.ok) {
      console.warn('Failed to fetch work item area paths for filtered request');
      return [];
    }

    const workItems = await batchResponse.json();
    const areaPathsSet = new Set<string>();
    const currentProject = config.project?.toLowerCase() || '';

    if (workItems.value && Array.isArray(workItems.value)) {
      workItems.value.forEach((item: any) => {
        // Verify the work item belongs to the current project
        const workItemProject = item.fields?.['System.TeamProject']?.toLowerCase() || '';
        if (workItemProject !== currentProject) {
          // Skip work items from other projects
          return;
        }
        
        const areaPath = item.fields?.['System.AreaPath'];
        if (areaPath) {
          areaPathsSet.add(areaPath);
        }
      });
    }

    return Array.from(areaPathsSet).sort();
  } catch (error) {
    console.error('Error fetching area paths for type/state:', error);
    return [];
  }
}

export async function fetchTypesAndAreaPathsForStates(
  config: AzureDevOpsConfig,
  states: string[]
): Promise<{ types: string[]; areaPaths: string[]; tags: string[] }> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  if (!states || states.length === 0) {
    return { types: [], areaPaths: [], tags: [] };
  }

  try {
    const stateCondition = states.length === 1
      ? `[System.State] = '${states[0]}'`
      : `[System.State] IN (${states.map(state => `'${state}'`).join(', ')})`;

    const wiqlQuery = `SELECT [System.Id], [System.WorkItemType], [System.AreaPath] FROM WorkItems WHERE ${stateCondition} ORDER BY [System.ChangedDate] DESC`;

    const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.1`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: wiqlQuery })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch work items by state: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.workItems || data.workItems.length === 0) {
      return { types: [], areaPaths: [], tags: [] };
    }

    const ids = data.workItems.map((wi: any) => wi.id).slice(0, 200);
    if (ids.length === 0) {
      return { types: [], areaPaths: [], tags: [] };
    }

    const batchUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.WorkItemType,System.AreaPath,System.Tags,System.TeamProject&api-version=7.1`;

    const batchResponse = await fetch(batchUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!batchResponse.ok) {
      console.warn('Failed to fetch work item details for states filter');
      return { types: [], areaPaths: [], tags: [] };
    }

    const workItems = await batchResponse.json();
    const typesSet = new Set<string>();
    const areaPathsSet = new Set<string>();
    const tagsSet = new Set<string>();
    const currentProject = config.project?.toLowerCase() || '';

    if (workItems.value && Array.isArray(workItems.value)) {
      workItems.value.forEach((item: any) => {
        // Verify the work item belongs to the current project
        const workItemProject = item.fields?.['System.TeamProject']?.toLowerCase() || '';
        if (workItemProject !== currentProject) {
          // Skip work items from other projects
          return;
        }
        
        const type = item.fields?.['System.WorkItemType'];
        const areaPath = item.fields?.['System.AreaPath'];
        const tags = item.fields?.['System.Tags'];
        if (type) {
          typesSet.add(type);
        }
        if (areaPath) {
          areaPathsSet.add(areaPath);
        }
        if (tags) {
          tags.split(';').map((t: string) => t.trim()).forEach((tag: string) => {
            if (tag) {
              tagsSet.add(tag);
            }
          });
        }
      });
    }

    return {
      types: Array.from(typesSet).sort((a, b) => a.localeCompare(b)),
      areaPaths: Array.from(areaPathsSet).sort((a, b) => a.localeCompare(b)),
      tags: Array.from(tagsSet).sort((a, b) => a.localeCompare(b))
    };
  } catch (error) {
    console.error('Error fetching types and area paths for states:', error);
    return { types: [], areaPaths: [], tags: [] };
  }
}

export async function fetchProjects(config: AzureDevOpsConfig): Promise<string[]> {
  if (!config.accessToken || !config.organization) {
    throw new Error('Missing required configuration');
  }

  const url = `https://dev.azure.com/${config.organization}/_apis/projects?stateFilter=All&api-version=7.1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data?.value || !Array.isArray(data.value)) {
    return [];
  }

  return data.value
    .map((project: any) => project?.name)
    .filter((name: string | undefined) => typeof name === 'string' && name.trim().length > 0)
    .map((name: string) => name.trim())
    .sort((a: string, b: string) => a.localeCompare(b));
}

/**
 * Fetch work item types and states for a given area path
 */
export async function fetchTypesAndStatesForAreaPath(
  config: AzureDevOpsConfig,
  areaPaths: string[]
): Promise<{ types: string[]; states: string[] }> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  try {
    // Build WIQL query to find work items in the specified area paths
    const areaPathConditions = areaPaths.map(path => `[System.AreaPath] UNDER '${path}'`).join(' OR ');
    const wiqlQuery = `SELECT [System.Id], [System.WorkItemType], [System.State] FROM WorkItems WHERE (${areaPathConditions}) ORDER BY [System.ChangedDate] DESC`;
    
    const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.1`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: wiqlQuery })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch work items: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.workItems || data.workItems.length === 0) {
      return { types: [], states: [] };
    }

    // Fetch work item details to get types and states (limit to 200 items)
    const ids = data.workItems.map((wi: any) => wi.id).slice(0, 200);
    const batchUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.WorkItemType,System.State,System.TeamProject&api-version=7.1`;

    const batchResponse = await fetch(batchUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!batchResponse.ok) {
      console.warn('Failed to fetch work item details');
      return { types: [], states: [] };
    }

    const workItems = await batchResponse.json();
    
    // Extract unique types and states
    // Only include work items that belong to the current project
    const typesSet = new Set<string>();
    const statesSet = new Set<string>();
    const currentProject = config.project?.toLowerCase() || '';
    
    if (workItems.value && Array.isArray(workItems.value)) {
      workItems.value.forEach((item: any) => {
        if (item.fields) {
          // Verify the work item belongs to the current project
          const workItemProject = item.fields['System.TeamProject']?.toLowerCase() || '';
          if (workItemProject !== currentProject) {
            // Skip work items from other projects
            return;
          }
          
          if (item.fields['System.WorkItemType']) {
            typesSet.add(item.fields['System.WorkItemType']);
          }
          if (item.fields['System.State']) {
            statesSet.add(item.fields['System.State']);
          }
        }
      });
    }

    return {
      types: Array.from(typesSet).sort(),
      states: Array.from(statesSet).sort()
    };
  } catch (error) {
    console.error('Error fetching types and states for area path:', error);
    return { types: [], states: [] };
  }
}

/**
 * Fetch work item types and states for given tags
 */
export async function fetchTypesAndStatesForTags(
  config: AzureDevOpsConfig,
  tags: string[]
): Promise<{ types: string[]; states: string[]; areaPaths: string[] }> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  try {
    // Build WIQL query to find work items with the specified tags
    const tagConditions = tags.map(tag => `[System.Tags] CONTAINS '${tag}'`).join(' OR ');
    const wiqlQuery = `SELECT [System.Id], [System.WorkItemType], [System.State] FROM WorkItems WHERE (${tagConditions}) ORDER BY [System.ChangedDate] DESC`;
    
    const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.1`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: wiqlQuery })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch work items: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.workItems || data.workItems.length === 0) {
      return { types: [], states: [], areaPaths: [] };
    }

    // Fetch work item details to get types, states, and area paths (limit to 200 items)
    const ids = data.workItems.map((wi: any) => wi.id).slice(0, 200);
    const batchUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.WorkItemType,System.State,System.AreaPath,System.TeamProject&api-version=7.1`;

    const batchResponse = await fetch(batchUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!batchResponse.ok) {
      console.warn('Failed to fetch work item details');
      return { types: [], states: [], areaPaths: [] };
    }

    const workItems = await batchResponse.json();
    
    // Extract unique types, states, and area paths
    // Only include work items that belong to the current project
    const typesSet = new Set<string>();
    const statesSet = new Set<string>();
    const areaPathsSet = new Set<string>();
    const currentProject = config.project?.toLowerCase() || '';
    
    if (workItems.value && Array.isArray(workItems.value)) {
      workItems.value.forEach((item: any) => {
        if (item.fields) {
          // Verify the work item belongs to the current project
          const workItemProject = item.fields['System.TeamProject']?.toLowerCase() || '';
          if (workItemProject !== currentProject) {
            // Skip work items from other projects
            return;
          }
          
          if (item.fields['System.WorkItemType']) {
            typesSet.add(item.fields['System.WorkItemType']);
          }
          if (item.fields['System.State']) {
            statesSet.add(item.fields['System.State']);
          }
          if (item.fields['System.AreaPath']) {
            areaPathsSet.add(item.fields['System.AreaPath']);
          }
        }
      });
    }

    return {
      types: Array.from(typesSet).sort(),
      states: Array.from(statesSet).sort(),
      areaPaths: Array.from(areaPathsSet).sort()
    };
  } catch (error) {
    console.error('Error fetching types and states for tags:', error);
    return { types: [], states: [], areaPaths: [] };
  }
}

/**
 * Fetch tags filtered by work item type, states, and area paths
 */
export async function fetchTagsForTypeStateAndAreaPath(
  config: AzureDevOpsConfig,
  workItemType: string,
  states: string[],
  areaPaths: string[]
): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  try {
    // Build WIQL query with filters
    const conditions: string[] = [];
    
    // Work item type filter
    conditions.push(`[System.WorkItemType] = '${workItemType}'`);
    
    // States filter
    if (states && states.length > 0) {
      if (states.length === 1) {
        conditions.push(`[System.State] = '${states[0]}'`);
      } else {
        const statesList = states.map(s => `'${s}'`).join(', ');
        conditions.push(`[System.State] IN (${statesList})`);
      }
    }
    
    // Area paths filter
    if (areaPaths && areaPaths.length > 0) {
      if (areaPaths.length === 1) {
        conditions.push(`[System.AreaPath] UNDER '${areaPaths[0]}'`);
      } else {
        const areaPathFilters = areaPaths.map(path => `[System.AreaPath] UNDER '${path}'`);
        conditions.push(`(${areaPathFilters.join(' OR ')})`);
      }
    }
    
    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(' AND ')} ORDER BY [System.ChangedDate] DESC`;
    
    const url = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.1`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: wiqlQuery })
    });

    if (!response.ok) {
      console.warn('Failed to fetch tags, returning empty array');
      return [];
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
    return [];
  }
}

export async function fetchTags(config: AzureDevOpsConfig): Promise<string[]> {
  if (!config.accessToken || !config.organization || !config.project) {
    throw new Error('Missing required configuration');
  }

  const allTagsSet = new Set<string>();

  try {
    const tagNames: string[] = [];
    let continuationToken: string | null = null;

    do {
      let requestUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/tags?api-version=7.1`;
      if (continuationToken) {
        requestUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }

      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to fetch tags page, aborting remaining pages');
        break;
      }

      const data = await response.json();
      if (data.value && Array.isArray(data.value)) {
        data.value.forEach((tag: any) => {
          if (tag && tag.name) {
            tagNames.push(tag.name);
          }
        });
      }

      continuationToken = response.headers.get('x-ms-continuationtoken');
    } while (continuationToken);

    tagNames.forEach(tag => allTagsSet.add(tag));
  } catch (error) {
    console.warn('Error fetching tags, returning empty array:', error);
  }

  try {
    const wiqlTags = await fetchTagsViaWiql(config);
    wiqlTags.forEach(tag => allTagsSet.add(tag));
  } catch (error) {
    console.warn('Error fetching tags via WIQL fallback:', error);
  }

  return Array.from(allTagsSet).sort((a, b) => a.localeCompare(b));
}

async function fetchTagsViaWiql(config: AzureDevOpsConfig): Promise<string[]> {
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
    throw new Error(`Failed to fetch tags via WIQL: ${response.status}`);
  }

  const data = await response.json();
  if (!data.workItems || data.workItems.length === 0) {
    return [];
  }

  const ids = data.workItems.map((wi: any) => wi.id).slice(0, 200);
  if (ids.length === 0) {
    return [];
  }

  const batchUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.Tags&api-version=7.1`;

  const batchResponse = await fetch(batchUrl, {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!batchResponse.ok) {
    throw new Error(`Failed to fetch work item details for tags via WIQL fallback: ${batchResponse.status}`);
  }

  const workItems = await batchResponse.json();
  const tagsSet = new Set<string>();

  if (workItems.value && Array.isArray(workItems.value)) {
    workItems.value.forEach((item: any) => {
      if (item.fields && item.fields['System.Tags']) {
        const tags = item.fields['System.Tags'].split(';').map((t: string) => t.trim());
        tags.forEach(tag => {
          if (tag) {
            tagsSet.add(tag);
          }
        });
      }
    });
  }

  return Array.from(tagsSet);
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
  
  // Don't clean up URL here - let the component handle navigation
  
  return tokens;
}

/**
 * Initiate OAuth flow
 */
export async function initiateOAuthFlow(): Promise<void> {
  // Generate and store state for CSRF protection
  const state = Math.random().toString(36).substring(7);
  sessionStorage.setItem('oauth_state', state);
  
  // Store current session info to restore after OAuth
  const currentSessionData = sessionStorage.getItem('currentSession');
  if (currentSessionData) {
    sessionStorage.setItem('oauth_session_backup', currentSessionData);
  }
  
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
    // Note: The 'query' parameter already includes work item type filter if it was built from filters
    // If query is provided, use it as-is (it already contains all filters including work item type)
    // If no query, use workItemType from config as fallback
    let wiqlQuery: string;
    if (query) {
      // Query already contains work item type filter, so use it directly
      wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE ${query}`;
    } else {
      // No query provided, use workItemType from config as fallback
      wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = '${workItemType}' AND [System.State] = 'Active'`;
    }
    
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
    
    // Step 2: Get full work item details (batch API doesn't support $expand=relations)
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

    const detailBatchSize = 200;
    const allWorkItems: any[] = [];

    for (let i = 0; i < workItemIds.length; i += detailBatchSize) {
      const idsSlice = workItemIds.slice(i, i + detailBatchSize);
      const idsString = idsSlice.join(',');
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
      if (workItemsData.value && Array.isArray(workItemsData.value)) {
        allWorkItems.push(...workItemsData.value);
      }
    }

    if (allWorkItems.length === 0) {
      return [];
    }
    
    // Step 3: Fetch relations for each work item to find Epic parents
    // Map to store work item ID -> parent ID
    const workItemToParentMap = new Map<number, number>();
    const epicTitlesMap = new Map<number, string>();
    const parentTitlesMap = new Map<number, string>();
    
    // Fetch relations in batches of 10
    const batchSize = 10;
    for (let i = 0; i < allWorkItems.length; i += batchSize) {
      const batch = allWorkItems.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (item: any) => {
        try {
          // Fetch relations for this work item
          const relationsUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${item.id}?$expand=relations&api-version=7.0`;
          const relationsResponse = await fetch(relationsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (relationsResponse.ok) {
            const relationsData = await relationsResponse.json();
            
            // Find parent relationship (Hierarchy-Forward)
            if (relationsData.relations) {
              for (const relation of relationsData.relations) {
                if (relation.rel === 'System.LinkTypes.Hierarchy-Forward') {
                  // Extract parent ID from URL (e.g., .../workitems/12345)
                  const match = relation.url.match(/\/work[iI]tems\/(\d+)(?:\?|$|\/)/i);
                  if (match) {
                    const parentId = parseInt(match[1], 10);
                    workItemToParentMap.set(item.id, parentId);
                    // Debug: console.log(`Work item ${item.id} has parent ${parentId}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching relations for work item ${item.id}:`, error);
        }
      }));
    }
    
    // Step 4: Fetch parent work items to check if they are Epics
    const parentIds = Array.from(new Set(workItemToParentMap.values()));
    if (parentIds.length > 0) {
      const parentIdsString = parentIds.slice(0, 200).join(',');
      const parentFields = ['System.Id', 'System.Title', 'System.WorkItemType'].join(',');
      const parentUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems?ids=${parentIdsString}&fields=${parentFields}&api-version=7.0`;
      
      try {
        const parentResponse = await fetch(parentUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (parentResponse.ok) {
          const parentData = await parentResponse.json();
          for (const parent of parentData.value) {
            parentTitlesMap.set(parent.id, parent.fields['System.Title'] || '');
            if (parent.fields['System.WorkItemType'] === 'Epic') {
              epicTitlesMap.set(parent.id, parent.fields['System.Title'] || '');
              // Debug: console.log(`Found Epic ${parent.id}: ${parent.fields['System.Title']}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching parent work items:', error);
      }
    }
    
    // Step 5: Transform the response and add Epic information
    return allWorkItems.map((item: any) => {
      // Find Epic for this work item
      let epicTitle: string | null = null;
      
      // Strategy 1: Check parent Epic relationship
      const parentId = workItemToParentMap.get(item.id);
      if (parentId) {
        epicTitle = epicTitlesMap.get(parentId) || null;
        if (epicTitle) {
          // Debug: console.log(`Work item ${item.id} has Epic from parent ${parentId}: ${epicTitle}`);
        } else {
          const parentTitle = parentTitlesMap.get(parentId);
          // Debug: console.log(`Work item ${item.id} has parent ${parentId} (${parentTitle}) but it's not an Epic type`);
        }
      }
      
      // Strategy 2: Check for Epic fields in the work item itself (if not found via parent)
      if (!epicTitle && item.fields) {
        const allFields = Object.keys(item.fields);
        const possibleEpicFields = [
          'System.Epic', 
          'Epic', 
          'Microsoft.VSTS.Common.Epic',
          'Custom.Epic',
          'EpicLink',
          'EpicName',
          ...allFields.filter(f => f.toLowerCase().includes('epic') && !['System.Epic', 'Epic', 'Microsoft.VSTS.Common.Epic', 'Custom.Epic', 'EpicLink', 'EpicName'].includes(f))
        ];
        
        for (const fieldName of possibleEpicFields) {
          const epicFieldValue = item.fields[fieldName];
          if (epicFieldValue !== undefined && epicFieldValue !== null) {
            if (typeof epicFieldValue === 'string' && epicFieldValue.trim() !== '') {
              const epicId = parseInt(epicFieldValue.trim());
              if (!isNaN(epicId) && epicId > 0) {
                epicTitle = epicTitlesMap.get(epicId) || null;
                if (epicTitle) {
                  // Debug: console.log(`Work item ${item.id} has Epic ID ${epicId} from field ${fieldName}: ${epicTitle}`);
                  break;
                }
              } else {
                epicTitle = epicFieldValue.trim();
                // Debug: console.log(`Work item ${item.id} has Epic name from field ${fieldName}: ${epicTitle}`);
                break;
              }
            } else if (typeof epicFieldValue === 'number') {
              epicTitle = epicTitlesMap.get(epicFieldValue) || null;
              if (epicTitle) {
                // Debug: console.log(`Work item ${item.id} has Epic ID ${epicFieldValue} from field ${fieldName}: ${epicTitle}`);
                break;
              }
            }
          }
        }
      }
      
      if (!epicTitle) {
        // Debug: console.log(`Work item ${item.id} (${item.fields['System.Title']}) has no Epic found`);
      }
      
      return {
      id: item.id,
      fields: {
        'System.Title': item.fields['System.Title'],
        'System.Description': item.fields['System.Description'],
        'System.Tags': item.fields['System.Tags'],
        'System.WorkItemType': item.fields['System.WorkItemType'],
        'System.State': item.fields['System.State'],
        'Microsoft.VSTS.Common.Priority': item.fields['Microsoft.VSTS.Common.Priority'],
        'System.AreaPath': item.fields['System.AreaPath'],
          'System.IterationPath': item.fields['System.IterationPath'],
          'Epic': epicTitle || undefined
      },
      url: `https://dev.azure.com/${organization}/${project}/_workitems/edit/${item.id}`
      };
    });
    
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
    // Use Epic from fields if available (fetched from relations)
    let epic: string | undefined = undefined;
    const epicField = item.fields['Epic'];
    const workItemType = item.fields['System.WorkItemType'];
    
    // Only use epic if it's actually set and not the same as the work item type
    if (epicField && typeof epicField === 'string' && epicField.trim() !== '') {
      const trimmedEpic = epicField.trim();
      // Make sure it's not the work item type or just "Epic"
      if (trimmedEpic !== workItemType && trimmedEpic !== 'Epic' && trimmedEpic.toLowerCase() !== 'epic') {
        epic = trimmedEpic;
        // Debug: console.log(`Work item ${item.id} converted - Epic: "${epic}"`);
      } else {
        console.warn(`Work item ${item.id} has epic field "${trimmedEpic}" which matches work item type "${workItemType}" - ignoring`);
      }
    }
    
    // Debug log if epic is missing
    if (!epic && workItemType !== 'Epic') {
      // Debug: console.log(`Work item ${item.id} (${item.fields['System.Title']}) has no Epic assigned`);
    }
    
    // Clean description - strip HTML tags
    const description = item.fields['System.Description'] || '';
    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
    
    // IMPORTANT: Always use System.Title for the work item title, NEVER use Epic name
    // The Epic name goes in the 'epic' field, not the 'title' field
    const workItemTitle = item.fields['System.Title'] || 'Untitled';
    
    // Validate that title is not accidentally the Epic name
    if (epic && workItemTitle === epic) {
      console.warn(`Work item ${item.id}: Title "${workItemTitle}" matches Epic name "${epic}" - this may indicate a data issue`);
    }
    
    return {
      id: `ado-${item.id}`,
      title: workItemTitle,
      description: cleanDescription,
      votes: 0,
      voters: [] as any[],
      epic: epic || undefined,
      state: item.fields['System.State'] || undefined,
      areaPath: item.fields['System.AreaPath'] || undefined,
      tags: item.fields['System.Tags']
        ? item.fields['System.Tags'].split(';').map((t: string) => t.trim()).filter((t: string) => t)
        : [],
      azureDevOpsId: item.id.toString(),
      azureDevOpsUrl: item.url,
      workItemType: workItemType || undefined
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