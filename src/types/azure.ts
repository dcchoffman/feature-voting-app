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
    'Epic'?: string;
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
  workItemType?: string;
}

export interface VoterInfo {
  userId: string;
  name: string;
  email: string;
  voteCount: number;
}

export interface FeatureSuggestion {
  id: string;
  session_id: string;
  title: string;
  summary: string | null;
  whatWouldItDo: string | null;
  howWouldItWork: string | null;
  status: 'pending' | 'future';
  requester_id: string | null;
  requester_name: string | null;
  requester_email: string | null;
  created_at: string;
}

export interface VotingSession {
  title: string;
  goal: string;
  votesPerUser: number;
  useAutoVotes: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId?: string | null;
  productName?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  originalEndDate?: string | null;  // Store original end date when ended early
  endedEarlyBy?: string | null;     // Name of admin who ended early
  endedEarlyReason?: string | null; // Reason selected from dropdown
  endedEarlyDetails?: string | null; // Optional additional details
  reopenReason?: string | null;     // Reason provided when session was reopened
  reopenDetails?: string | null;    // Additional context for reopening
  reopenedBy?: string | null;       // Name of admin who reopened the session
  reopenedAt?: string | null;       // Timestamp captured when session was reopened
}