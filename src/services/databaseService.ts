import { supabase } from '../supabaseClient';

// ============================================
// FEATURES
// ============================================

export async function getFeatures() {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createFeature(feature: {
  title: string;
  description: string;
  epic: string | null;
  azure_devops_id?: string | null;
  azure_devops_url?: string | null;
}) {
  const { data, error } = await supabase
    .from('features')
    .insert([feature])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateFeature(id: string, updates: {
  title?: string;
  description?: string;
  epic?: string | null;
  azure_devops_id?: string | null;
  azure_devops_url?: string | null;
}) {
  const { data, error } = await supabase
    .from('features')
    .update(updates)
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
// VOTES
// ============================================

export async function getVotes() {
  const { data, error } = await supabase
    .from('votes')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

export async function saveVote(vote: {
  feature_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  vote_count: number;
}) {
  // First, check if vote already exists
  const { data: existing } = await supabase
    .from('votes')
    .select('*')
    .eq('feature_id', vote.feature_id)
    .eq('user_id', vote.user_id)
    .single();
  
  if (existing) {
    // Update existing vote
    const { data, error } = await supabase
      .from('votes')
      .update({ vote_count: vote.vote_count })
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

export async function deleteAllVotes() {
  const { error } = await supabase
    .from('votes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
  
  if (error) throw error;
}

// ============================================
// VOTING SESSION
// ============================================

export async function getActiveVotingSession() {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    // If no session exists, return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  
  return data;
}

export async function saveVotingSession(session: {
  title: string;
  goal: string;
  votes_per_user: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}) {
  // Check if a session already exists
  const { data: existing } = await supabase
    .from('voting_sessions')
    .select('*')
    .limit(1)
    .single();
  
  if (existing) {
    // Update existing session
    const { data, error } = await supabase
      .from('voting_sessions')
      .update(session)
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Create new session
    const { data, error } = await supabase
      .from('voting_sessions')
      .insert([session])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// ============================================
// AZURE DEVOPS CONFIG
// ============================================

export async function getAzureDevOpsConfig() {
  try {
    const { data, error } = await supabase
      .from('azure_devops_config')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      // If table doesn't exist or no data, return null
      if (error.code === 'PGRST116' || error.message.includes('406')) {
        console.warn('Azure DevOps config not found, returning null');
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

export async function saveAzureDevOpsConfig(config: {
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
  lastSyncTime?: string | null;
}) {
  try {
    // Map camelCase to snake_case for database, filtering out undefined
    const dbConfig: any = {
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
    
    // Get existing config to use its ID
    const { data: existing } = await supabase
      .from('azure_devops_config')
      .select('id')
      .maybeSingle();
    
    // If exists, include the ID for upsert to work
    if (existing) {
      const { data, error } = await supabase
        .from('azure_devops_config')
        .upsert({ ...dbConfig, id: existing.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('azure_devops_config')
        .insert([dbConfig])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error saving Azure DevOps config:', error);
    throw error;
  }
}