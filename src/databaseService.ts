import { supabase } from './supabaseClient'

export interface Feature {
  id: string;
  title: string;
  description: string;
  epic?: string;
  azure_devops_id?: string;
  azure_devops_url?: string;
}

export interface Vote {
  id: string;
  feature_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  vote_count: number;
}

export interface VotingSession {
  id: string;
  title: string;
  goal: string;
  votes_per_user: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// Features
export async function getFeatures() {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .order('title')
  
  if (error) throw error
  return data || []
}

export async function createFeature(feature: Omit<Feature, 'id'>) {
  const { data, error } = await supabase
    .from('features')
    .insert([feature])
    .select()
  
  if (error) throw error
  return data[0]
}

export async function updateFeature(id: string, updates: Partial<Feature>) {
  const { data, error } = await supabase
    .from('features')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export async function deleteFeature(id: string) {
  const { error } = await supabase
    .from('features')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Votes
export async function getVotes() {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
  
  if (error) throw error
  return data || []
}

export async function saveVote(vote: Omit<Vote, 'id'>) {
  const { data, error } = await supabase
    .from('votes')
    .upsert([vote], { 
      onConflict: 'feature_id,user_id',
      ignoreDuplicates: false 
    })
    .select()
  
  if (error) throw error
  return data[0]
}

export async function deleteVotesForFeature(featureId: string) {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('feature_id', featureId)
  
  if (error) throw error
}

export async function deleteAllVotes() {
  const { error } = await supabase
    .from('votes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (error) throw error
}

// Voting Sessions
export async function getActiveVotingSession() {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (error) throw error
  return data?.[0] || null
}

export async function createVotingSession(session: Omit<VotingSession, 'id'>) {
  const { data, error } = await supabase
    .from('voting_sessions')
    .insert([session])
    .select()
  
  if (error) throw error
  return data[0]
}

export async function updateVotingSession(id: string, updates: Partial<VotingSession>) {
  const { data, error } = await supabase
    .from('voting_sessions')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}
