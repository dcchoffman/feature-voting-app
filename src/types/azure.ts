export interface AzureDevOpsConfig {
  organization: string;
  project: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  tenantId?: string;
  clientId?: string;
  enabled: boolean;
  workItemType: string;
  query?: string;
  lastSyncTime?: string;
  states?: string[];   
  areaPath?: string;
  tags?: string[];
}

export interface AzureDevOpsWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.Tags'?: string;
    'System.WorkItemType': string;
    'System.State': string;
    'Microsoft.VSTS.Common.Priority'?: number;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
  };
  url: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  votes: number;
  voters: VoterInfo[];
  epic?: string;
  state?: string; 
  areaPath?: string;  
  tags?: string[];
  azureDevOpsId?: string;
  azureDevOpsUrl?: string;
}

export interface VoterInfo {
  userId: string;
  name: string;
  email: string;
  voteCount: number;
}

export interface VotingSession {
  // ... existing fields
  originalEndDate?: string;  // Store original end date when ended early
  endedEarlyBy?: string;     // Name of admin who ended early
  endedEarlyReason?: string; // Reason selected from dropdown
  endedEarlyDetails?: string; // Optional additional details
}