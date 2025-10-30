// ============================================
// Multi-Tenant Database Service
// ============================================
// Location: src/services/databaseService.ts
// ============================================

import { supabase } from '../supabaseClient';
import type { 
  DbVotingSession, DbFeature, DbVote, DbAzureDevOpsConfig,
  DbUser, DbSessionAdmin, DbSessionStakeholder,
  User, VotingSession, SessionAdmin, SessionStakeholder
} from '../types';

// ============================================
// USERS
// ============================================

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
}

export async function createUser(user: { email: string; name: string }): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getOrCreateUser(email: string, name: string): Promise<User> {
  let user = await getUserByEmail(email);
  if (!user) {
    user = await createUser({ email, name });
  }
  return user;
}

// ============================================
// VOTING SESSIONS
// ============================================

export async function getAllSessions(): Promise<VotingSession[]> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getSessionById(id: string): Promise<VotingSession | null> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
}

export async function getSessionByCode(code: string): Promise<VotingSession | null> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select('*')
    .eq('session_code', code)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
}

export async function getSessionsForUser(userId: string): Promise<VotingSession[]> {
  // Get sessions where user is admin
  const { data: adminSessions, error: adminError } = await supabase
    .from('session_admins')
    .select('session_id')
    .eq('user_id', userId);
  
  if (adminError) throw adminError;
  
  const adminSessionIds = adminSessions?.map(s => s.session_id) || [];
  
  // Get sessions where user is stakeholder (by email)
  const user = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();
  
  if (user.error) throw user.error;
  
  const { data: stakeholderSessions, error: stakeholderError } = await supabase
    .from('session_stakeholders')
    .select('session_id')
    .eq('user_email', user.data.email);
  
  if (stakeholderError) throw stakeholderError;
  
  const stakeholderSessionIds = stakeholderSessions?.map(s => s.session_id) || [];
  
  // Combine and get unique session IDs
  const allSessionIds = [...new Set([...adminSessionIds, ...stakeholderSessionIds])];
  
  if (allSessionIds.length === 0) return [];
  
  // Get all sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('voting_sessions')
    .select('*')
    .in('id', allSessionIds)
    .order('created_at', { ascending: false });
  
  if (sessionsError) throw sessionsError;
  
  return sessions || [];
}

export async function createSession(session: Omit<DbVotingSession, 'id' | 'created_at'>): Promise<VotingSession> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .insert([session])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSession(id: string, updates: Partial<DbVotingSession>): Promise<VotingSession> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('voting_sessions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// SESSION ADMINS
// ============================================

export async function getSessionAdmins(sessionId: string): Promise<SessionAdmin[]> {
  const { data, error } = await supabase
    .from('session_admins')
    .select(`
      *,
      users (*)
    `)
    .eq('session_id', sessionId);
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    session_id: item.session_id,
    user_id: item.user_id,
    created_at: item.created_at,
    user: item.users as User
  }));
}

export async function addSessionAdmin(sessionId: string, userId: string): Promise<SessionAdmin> {
  const { data, error } = await supabase
    .from('session_admins')
    .insert([{ session_id: sessionId, user_id: userId }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function removeSessionAdmin(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('session_admins')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  
  if (error) throw error;
}

export async function isUserSessionAdmin(sessionId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('session_admins')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Caught exception checking admin:', err);
    return false;
  }
}

// ============================================
// SESSION STAKEHOLDERS
// ============================================

export async function getSessionStakeholders(sessionId: string): Promise<SessionStakeholder[]> {
  const { data, error } = await supabase
    .from('session_stakeholders')
    .select('*')
    .eq('session_id', sessionId)
    .order('user_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function addSessionStakeholder(stakeholder: Omit<DbSessionStakeholder, 'id' | 'created_at'>): Promise<SessionStakeholder> {
  const { data, error } = await supabase
    .from('session_stakeholders')
    .insert([stakeholder])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function removeSessionStakeholder(sessionId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('session_stakeholders')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_email', email);
  
  if (error) throw error;
}

export async function updateStakeholderVoteStatus(sessionId: string, email: string, hasVoted: boolean): Promise<void> {
  const updates: any = { has_voted: hasVoted };
  if (hasVoted) {
    updates.voted_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('session_stakeholders')
    .update(updates)
    .eq('session_id', sessionId)
    .eq('user_email', email);
  
  if (error) throw error;
}

export async function isUserSessionStakeholder(sessionId: string, email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('session_stakeholders')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking stakeholder status:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Caught exception checking stakeholder:', err);
    return false;
  }
}

// ============================================
// FEATURES (Session-scoped)
// ============================================

export async function getFeatures(sessionId: string) {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createFeature(feature: {
  session_id: string;
  title: string;
  description: string;
  epic: string | null;
  state?: string | null;
  areaPath?: string | null;
  tags?: string[] | null;
  azure_devops_id?: string | null;
  azure_devops_url?: string | null;
}) {
  const { data, error } = await supabase
    .from('features')
    .insert([{
      session_id: feature.session_id,
      title: feature.title,
      description: feature.description,
      epic: feature.epic,
      state: feature.state,
      area_path: feature.areaPath,
      tags: feature.tags,
      azure_devops_id: feature.azure_devops_id,
      azure_devops_url: feature.azure_devops_url
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateFeature(id: string, updates: {
  title?: string;
  description?: string;
  epic?: string | null;
  state?: string | null;
  areaPath?: string | null;
  tags?: string[] | null;
  azure_devops_id?: string | null;
  azure_devops_url?: string | null;
}) {
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.epic !== undefined) dbUpdates.epic = updates.epic;
  if (updates.state !== undefined) dbUpdates.state = updates.state;
  if (updates.areaPath !== undefined) dbUpdates.area_path = updates.areaPath;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.azure_devops_id !== undefined) dbUpdates.azure_devops_id = updates.azure_devops_id;
  if (updates.azure_devops_url !== undefined) dbUpdates.azure_devops_url = updates.azure_devops_url;
  
  const { data, error } = await supabase
    .from('features')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteFeature(id: string) {
  const { error } = await supabase
    .from('features')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// VOTES (Session-scoped)
// ============================================

export async function getVotes(sessionId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('session_id', sessionId);
  
  if (error) throw error;
  return data || [];
}

export async function saveVote(vote: {
  session_id: string;
  feature_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  vote_count: number;
}) {
  // Check if vote already exists
  const { data: existing } = await supabase
    .from('votes')
    .select('*')
    .eq('session_id', vote.session_id)
    .eq('feature_id', vote.feature_id)
    .eq('user_id', vote.user_id)
    .single();
  
  if (existing) {
    // Update existing vote
    const { data, error } = await supabase
      .from('votes')
      .update({ vote_count: vote.vote_count })
      .eq('session_id', vote.session_id)
      .eq('feature_id', vote.feature_id)
      .eq('user_id', vote.user_id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Create new vote
    const { data, error } = await supabase
      .from('votes')
      .insert([vote])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export async function deleteVotesForFeature(featureId: string) {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('feature_id', featureId);
  
  if (error) throw error;
}

export async function deleteAllVotes(sessionId: string) {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('session_id', sessionId);
  
  if (error) throw error;
}

// ============================================
// AZURE DEVOPS CONFIG (Session-scoped)
// ============================================

export async function getAzureDevOpsConfig(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('azure_devops_config')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting Azure DevOps config:', error);
    return null;
  }
}

export async function saveAzureDevOpsConfig(sessionId: string, config: {
  organization: string;
  project: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  tenantId?: string | null;
  clientId?: string | null;
  enabled: boolean;
  workItemType: string;
  query?: string | null;
  states?: string[] | null;
  areaPath?: string | null;
  tags?: string[] | null;
  lastSyncTime?: string | null;
}) {
  try {
    const dbConfig: any = {
      session_id: sessionId,
      organization: config.organization,
      project: config.project,
      enabled: config.enabled,
      work_item_type: config.workItemType,
    };
    
    // Only include optional fields if they have values
    if (config.accessToken !== undefined) dbConfig.access_token = config.accessToken;
    if (config.refreshToken !== undefined) dbConfig.refresh_token = config.refreshToken;
    if (config.tokenExpiresAt !== undefined) dbConfig.token_expires_at = config.tokenExpiresAt;
    if (config.tenantId !== undefined) dbConfig.tenant_id = config.tenantId;
    if (config.clientId !== undefined) dbConfig.client_id = config.clientId;
    if (config.query !== undefined) dbConfig.query = config.query;
    if (config.lastSyncTime !== undefined) dbConfig.last_sync_time = config.lastSyncTime;
    if (config.states !== undefined) dbConfig.states = config.states;
    if (config.areaPath !== undefined) dbConfig.area_path = config.areaPath;
    if (config.tags !== undefined) dbConfig.tags = config.tags;
    
    // Delete any existing record first to handle corrupt/partial records
    await supabase
      .from('azure_devops_config')
      .delete()
      .eq('session_id', sessionId);
    
    // Now insert the fresh record
    const { data, error } = await supabase
      .from('azure_devops_config')
      .insert([dbConfig])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving Azure DevOps config:', error);
    throw error;
  }
}

// ============================================
// BACKWARD COMPATIBILITY (Deprecated)
// ============================================
// These functions maintain compatibility with single-session code
// They will use the first session they find

export async function getActiveVotingSession() {
  const sessions = await getAllSessions();
  return sessions[0] || null;
}

export async function createVotingSession(session: Omit<DbVotingSession, 'id' | 'created_at' | 'session_code'>) {
  const sessionCode = generateSessionCode();
  return createSession({ ...session, session_code: sessionCode });
}

export async function updateVotingSession(updates: Partial<DbVotingSession>) {
  const session = await getActiveVotingSession();
  if (!session) throw new Error('No session found');
  return updateSession(session.id, updates);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Add to databaseService.ts

export async function createInfoRequest(request: {
  session_id: string;
  feature_id: string;
  feature_title: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  created_at: string;
}) {
  const { data, error } = await supabase
    .from('info_requests')
    .insert([{
      session_id: request.session_id,
      feature_id: request.feature_id,
      feature_title: request.feature_title,
      requester_id: request.requester_id,
      requester_name: request.requester_name,
      requester_email: request.requester_email,
      created_at: request.created_at
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInfoRequests(sessionId: string) {
  const { data, error } = await supabase
    .from('info_requests')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// SYSTEM ADMINS
// ============================================

export async function getSystemAdmins() {
  const { data, error } = await supabase
    .from('system_admins')
    .select(`
      *,
      users (*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    user_id: item.user_id,
    created_at: item.created_at,
    user: item.users as User
  }));
}

export async function addSystemAdmin(userId: string) {
  const { data, error } = await supabase
    .from('system_admins')
    .insert([{ user_id: userId }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function removeSystemAdmin(userId: string) {
  const { error } = await supabase
    .from('system_admins')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
}

export async function isUserSystemAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking system admin status:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Caught exception checking system admin:', err);
    return false;
  }
}
