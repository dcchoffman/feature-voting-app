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
  created_at?: string;
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