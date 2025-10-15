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
  azureDevOpsId?: string;
  azureDevOpsUrl?: string;
}

export interface VoterInfo {
  userId: string;
  name: string;
  email: string;
  voteCount: number;
}

