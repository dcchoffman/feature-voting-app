// ============================================
// Multi-Tenant Voting System - Type Definitions
// ============================================
// Location: src/types/index.ts
// ============================================

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  tenant_id?: string | null;
  tenantId?: string | null;
  created_at?: string;
}

// ============================================
// SESSION TYPES
// ============================================

export interface VotingSession {
  id: string;
  title: string;
  goal: string;
  votes_per_user: number;
  use_auto_votes: boolean; // <-- ADD THIS LINE
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by?: string; // user_id of creator
  access_type: 'public' | 'invite-only';
  session_code: string; // Unique code for sharing
  product_id?: string | null;
  product_name?: string | null;
  created_at?: string;
  original_end_date?: string | null;
  ended_early_by?: string | null;
  ended_early_reason?: string | null;
  ended_early_details?: string | null;
  reopen_reason?: string | null;
  reopen_details?: string | null;
  reopened_by?: string | null;
  reopened_at?: string | null;
}

export interface SessionAdmin {
  id: string;
  session_id: string;
  user_id: string;
  created_at?: string;
  user?: User; // Populated with user details
}

export interface SessionStakeholder {
  id: string;
  session_id: string;
  user_email: string;
  user_name: string;
  votes_allocated: number;
  has_voted: boolean;
  voted_at?: string;
  created_at?: string;
}

export interface SessionContextType {
  currentSession: VotingSession | null;
  sessions: VotingSession[];
  currentUser: User | null;
  isAdmin: boolean;
  isStakeholder: boolean;
  isSystemAdmin: boolean;
  setCurrentSession: (session: VotingSession | null) => void;
  refreshSessions: (user?: User) => Promise<void>;
  setCurrentUser: (user: User | null) => Promise<void>;
}

export interface SessionStatusNote {
  id: string;
  sessionId: string;
  type: 'reopen' | 'ended-early';
  reason: string;
  details?: string | null;
  actorName: string;
  actorId?: string | null;
  createdAt: string;
}

// ============================================
// FEATURE TYPES
// ============================================

export interface Feature {
  id: string;
  session_id: string; // NEW: Links to voting session
  title: string;
  description: string;
  epic?: string | null;
  state?: string | null;
  areaPath?: string | null;
  tags?: string[] | null;
  azureDevOpsId?: string | null;
  azureDevOpsUrl?: string | null;
  votes: number;
  voters: VoterInfo[];
  created_at?: string;
}

export interface VoterInfo {
  userId: string;
  name: string;
  email: string;
  voteCount: number;
}

// ============================================
// VOTE TYPES
// ============================================

export interface Vote {
  id: string;
  session_id: string; // NEW: Links to voting session
  feature_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  vote_count: number;
  created_at?: string;
}

// ============================================
// AZURE DEVOPS TYPES
// ============================================

export interface AzureDevOpsConfig {
  id?: string;
  session_id?: string; // NEW: Links to voting session
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
  states?: string[];
  areaPath?: string;
  tags?: string[];
}

export interface Product {
  id: string;
  name: string;
  tenant_id?: string | null;
  color_hex?: string | null;
  created_at?: string;
}

export type DbVotingSession = VotingSession;

export interface DbFeature {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  epic: string | null;
  state: string | null;
  area_path: string | null;
  tags: string[] | null;
  azure_devops_id: string | null;
  azure_devops_url: string | null;
  created_at?: string;
}

export type DbSessionStakeholder = SessionStakeholder;