// ============================================
// Multi-Tenant Database Service
// ============================================
// Location: src/services/databaseService.ts
// ============================================

import { supabase } from '../supabaseClient';

const FEATURE_SUGGESTION_STATE = '__FEATURE_SUGGESTION__';
const FEATURE_SUGGESTION_TAG = '__feature_suggestion__';
const FEATURE_SUGGESTION_FUTURE_TAG = '__feature_future_session__';

function mapRowToSuggestion(row: any): FeatureSuggestion {
  let payload: any = {};

  if (row?.description) {
    try {
      payload = JSON.parse(row.description);
    } catch (error) {
      console.warn('[databaseService] Unable to parse suggestion payload', error);
      payload = {};
    }
  }

  const tags: string[] = Array.isArray(row?.tags) ? row.tags : [];
  const status: 'pending' | 'future' = tags.includes(FEATURE_SUGGESTION_FUTURE_TAG) ? 'future' : 'pending';

  return {
    id: row.id,
    session_id: row.session_id,
    title: row.title,
    summary: payload.summary ?? null,
    whatWouldItDo: payload.whatWouldItDo ?? null,
    howWouldItWork: payload.howWouldItWork ?? null,
    status,
    requester_id: payload.requesterId ?? null,
    requester_name: payload.requesterName ?? null,
    requester_email: payload.requesterEmail ?? null,
    created_at: row.created_at
  };
}
import type {
  DbVotingSession,
  DbFeature,
  DbSessionStakeholder,
  User,
  VotingSession,
  SessionAdmin,
  SessionStakeholder,
  SessionStatusNote,
  Product
} from '../types';
import type { FeatureSuggestion } from '../types/azure';

// ============================================
// USERS
// ============================================

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    // Test if supabase client methods exist
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Supabase client is not properly initialized');
    }
    
    // First, try a direct fetch to test if the API is reachable
    const testUrl = `${(supabase as any).supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;
    const testHeaders = {
      'apikey': (supabase as any).supabaseKey,
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    
    const directFetchPromise = fetch(testUrl, {
      method: 'GET',
      headers: testHeaders
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[databaseService] Direct fetch error:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      return { data: data.length > 0 ? data[0] : null, error: null };
    }).catch((err) => {
      console.error('[databaseService] Direct fetch exception:', err);
      throw err;
    });
    
    // Try direct fetch first with a shorter timeout
    const directFetchWithTimeout = Promise.race([
      directFetchPromise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Direct fetch timeout after 5 seconds')), 5000);
      })
    ]);
    
    try {
      const directResult = await directFetchWithTimeout as any;
      if (directResult.data) {
        return directResult.data;
      }
    } catch (directErr: any) {
      // Fall through to try Supabase client
    }
    
    // Create the query - Supabase queries execute when awaited
    const queryBuilder = supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
    // Wrap in a promise with timeout
    const queryWithTimeout = Promise.race([
      queryBuilder,
      new Promise((_, reject) => {
        setTimeout(() => {
          console.error('[databaseService] ⚠️ TIMEOUT: Query did not complete after 10 seconds');
          reject(new Error('Query timeout after 10 seconds'));
        }, 10000);
      })
    ]);
    
    const result = await queryWithTimeout as any;
    const { data, error } = result;
    
  if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
    throw error;
  }
  
  return data;
  } catch (error: any) {
    console.error('[databaseService] getUserByEmail error:', error);
    throw error;
  }
}

export async function createUser(user: { email: string; name: string; tenant_id?: string }): Promise<User> {
  // Default tenant ID for New Millennium Building Systems
  // TODO: Replace with actual tenant management when multi-tenant support is added
  const DEFAULT_TENANT_ID = '5e5482eb-82f0-4e76-8a6b-c6d74b01cd3a';
  
  const { data, error } = await supabase
    .from('users')
    .insert([{
      email: user.email,
      name: user.name,
      tenant_id: user.tenant_id || DEFAULT_TENANT_ID
    }])
    .select()
    .single();
  
  if (error) {
    console.error('[databaseService] createUser error:', error);
    throw error;
  }
  return data;
}

export async function getOrCreateUser(email: string, name: string): Promise<User> {
  try {
  let user = await getUserByEmail(email);
  if (!user) {
    user = await createUser({ email, name });
  }
  return user;
  } catch (error) {
    console.error('[databaseService] Error in getOrCreateUser:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export interface UserRoleInfo {
  userId: string;
  isSystemAdmin: boolean;
  sessionAdminCount: number;
  stakeholderSessionCount: number;
}

export async function getUserRoleInfo(userId: string): Promise<UserRoleInfo> {
  const [isSystemAdmin, sessionAdminData, userData] = await Promise.all([
    isUserSystemAdmin(userId),
    supabase
      .from('session_admins')
      .select('session_id')
      .eq('user_id', userId),
    supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()
  ]);

  const sessionAdminCount = sessionAdminData.data?.length || 0;
  
  let stakeholderCount = 0;
  if (userData.data?.email) {
    const { data: stakeholderData } = await supabase
      .from('session_stakeholders')
      .select('session_id')
      .eq('user_email', userData.data.email);
    stakeholderCount = stakeholderData?.length || 0;
  }

  return {
    userId,
    isSystemAdmin,
    sessionAdminCount,
    stakeholderSessionCount: stakeholderCount
  };
}

// ============================================
// PRODUCTS
// ============================================

const PRODUCTS_TABLE_MISSING_CODE = 'PRODUCTS_TABLE_MISSING';

export function isProductsTableMissingError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as any).code === PRODUCTS_TABLE_MISSING_CODE;
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      const tableMissingError = new Error('Products table is missing');
      (tableMissingError as any).code = PRODUCTS_TABLE_MISSING_CODE;
      throw tableMissingError;
    }
    throw error;
  }
  return data || [];
}

export async function createProduct(name: string, tenantId?: string): Promise<Product> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Product name is required');
  }

  const { data, error } = await supabase
    .from('products')
    .insert([tenantId ? { name: trimmedName, tenant_id: tenantId } : { name: trimmedName }])
    .select()
    .single();

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      const tableMissingError = new Error('Products table is missing');
      (tableMissingError as any).code = PRODUCTS_TABLE_MISSING_CODE;
      throw tableMissingError;
    }
    if ((error as any)?.code === '23505') {
      const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('name', trimmedName)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as Product;
    }

    throw error;
  }

  return data as Product;
}

export async function getProductsForTenant(tenantId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      const tableMissingError = new Error('Products table is missing');
      (tableMissingError as any).code = PRODUCTS_TABLE_MISSING_CODE;
      throw tableMissingError;
    }
    throw error;
  }
  return data || [];
}

export async function updateProduct(productId: string, updates: { name?: string; color_hex?: string | null }): Promise<Product> {
  if (!productId) {
    throw new Error('Product ID is required');
  }

  const updateData: { name?: string; color_hex?: string | null } = {};
  
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) {
      throw new Error('Product name cannot be empty');
    }
    updateData.name = trimmedName;
  }
  
  if (updates.color_hex !== undefined) {
    updateData.color_hex = updates.color_hex;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No updates provided');
  }

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      const tableMissingError = new Error('Products table is missing');
      (tableMissingError as any).code = PRODUCTS_TABLE_MISSING_CODE;
      throw tableMissingError;
    }
    throw error;
  }

  return data as Product;
}

export async function createProductForTenant(tenantId: string, name: string, colorHex?: string): Promise<Product> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Product name is required');
  }

  const { data, error } = await supabase
    .from('products')
    .insert([{ name: trimmedName, tenant_id: tenantId, color_hex: colorHex || null }])
    .select()
    .single();

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      const tableMissingError = new Error('Products table is missing');
      (tableMissingError as any).code = PRODUCTS_TABLE_MISSING_CODE;
      throw tableMissingError;
    }
    if ((error as any)?.code === '23505') {
      const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('name', trimmedName)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as Product;
    }

    throw error;
  }

  return data as Product;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    if ((error as any)?.code === 'PGRST205') {
      const tableMissingError = new Error('Products table is missing');
      (tableMissingError as any).code = PRODUCTS_TABLE_MISSING_CODE;
      throw tableMissingError;
    }
    throw error;
  }
}

// ============================================
// VOTING SESSIONS
// ============================================

type SessionRow = VotingSession & {
  product?: {
    name?: string | null;
  } | null;
};

const SESSION_SELECT = '*, product:products(name)';

function normalizeSessionRow(row: SessionRow | null): VotingSession {
  if (!row) {
    throw new Error('Unexpected empty session row');
  }

  const { product, ...rest } = row;
  const productName = rest.product_name ?? product?.name ?? null;

  return {
    ...rest,
    product_name: productName
  };
}

function normalizeSessionRows(rows: SessionRow[] | null | undefined): VotingSession[] {
  if (!rows || rows.length === 0) {
    return [];
  }
  return rows.map((row) => normalizeSessionRow(row));
}

export async function getAllSessions(): Promise<VotingSession[]> {
  try {
    // Use direct fetch as workaround for Supabase client query execution issue
    const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/voting_sessions?select=${encodeURIComponent(SESSION_SELECT)}&order=created_at.desc`;
    const apiHeaders = {
      'apikey': (supabase as any).supabaseKey,
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: apiHeaders
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[databaseService] getAllSessions API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
  return normalizeSessionRows(data as SessionRow[]);
  } catch (error) {
    console.error('[databaseService] Exception in getAllSessions:', error);
    throw error;
  }
}

export async function getSessionById(id: string): Promise<VotingSession | null> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select(SESSION_SELECT)
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data ? normalizeSessionRow(data as SessionRow) : null;
}

export async function getSessionByCode(code: string): Promise<VotingSession | null> {
  const { data, error } = await supabase
    .from('voting_sessions')
    .select(SESSION_SELECT)
    .eq('session_code', code)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data ? normalizeSessionRow(data as SessionRow) : null;
}

export async function getSessionsByProduct(productId: string): Promise<VotingSession[]> {
  try {
    const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/voting_sessions?product_id=eq.${productId}&select=${encodeURIComponent(SESSION_SELECT)}&order=created_at.desc`;
    const apiHeaders = {
      'apikey': (supabase as any).supabaseKey,
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: apiHeaders
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[databaseService] getSessionsByProduct API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return normalizeSessionRows(data as SessionRow[]);
  } catch (error) {
    console.error('[databaseService] Exception in getSessionsByProduct:', error);
    throw error;
  }
}

export async function getSessionsForUser(userId: string): Promise<VotingSession[]> {
  try {
  // Check if user is system admin first - system admins see ALL sessions
  const isSysAdmin = await isUserSystemAdmin(userId);
  if (isSysAdmin) {
    return getAllSessions();
  }
  
  // Get sessions where user is admin
    const adminApiUrl = `${(supabase as any).supabaseUrl}/rest/v1/session_admins?user_id=eq.${userId}&select=session_id`;
    const adminResponse = await fetch(adminApiUrl, {
      method: 'GET',
      headers: {
        'apikey': (supabase as any).supabaseKey,
        'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
        'Content-Type': 'application/json',
      }
    });
  
    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error('[databaseService] Error loading session admins:', adminResponse.status, errorText);
      throw new Error(`API error: ${adminResponse.status} - ${errorText}`);
    }
    
    const adminSessions = await adminResponse.json();
    const adminSessionIds = adminSessions?.map((s: any) => s.session_id) || [];
  
  // Get sessions where user is stakeholder (by email)
    const userApiUrl = `${(supabase as any).supabaseUrl}/rest/v1/users?id=eq.${userId}&select=email&limit=1`;
    const userResponse = await fetch(userApiUrl, {
      method: 'GET',
      headers: {
        'apikey': (supabase as any).supabaseKey,
        'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
        'Content-Type': 'application/json',
      }
    });
  
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('[databaseService] Error getting user email:', userResponse.status, errorText);
      throw new Error(`API error: ${userResponse.status} - ${errorText}`);
    }
    
    const userData = await userResponse.json();
    const userEmailValue = userData?.[0]?.email;
    
    if (!userEmailValue) {
      console.error('[databaseService] User email not found');
      throw new Error('User email not found');
    }
    
    const stakeholderApiUrl = `${(supabase as any).supabaseUrl}/rest/v1/session_stakeholders?user_email=eq.${encodeURIComponent(userEmailValue)}&select=session_id`;
    const stakeholderResponse = await fetch(stakeholderApiUrl, {
      method: 'GET',
      headers: {
        'apikey': (supabase as any).supabaseKey,
        'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
        'Content-Type': 'application/json',
      }
    });
  
    if (!stakeholderResponse.ok) {
      const errorText = await stakeholderResponse.text();
      console.error('[databaseService] Error loading session stakeholders:', stakeholderResponse.status, errorText);
      throw new Error(`API error: ${stakeholderResponse.status} - ${errorText}`);
    }
    
    const stakeholderSessions = await stakeholderResponse.json();
    const stakeholderSessionIds = stakeholderSessions?.map((s: any) => s.session_id) || [];
  // Combine and get unique session IDs
  const allSessionIds = [...new Set([...adminSessionIds, ...stakeholderSessionIds])];
  
    if (allSessionIds.length === 0) {
      return [];
    }
    
    // Get all sessions using direct fetch
    const sessionsApiUrl = `${(supabase as any).supabaseUrl}/rest/v1/voting_sessions?select=${encodeURIComponent(SESSION_SELECT)}&id=in.(${allSessionIds.join(',')})&order=created_at.desc`;
    const sessionsResponse = await fetch(sessionsApiUrl, {
      method: 'GET',
      headers: {
        'apikey': (supabase as any).supabaseKey,
        'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!sessionsResponse.ok) {
      const errorText = await sessionsResponse.text();
      console.error('[databaseService] Error loading voting sessions:', sessionsResponse.status, errorText);
      throw new Error(`API error: ${sessionsResponse.status} - ${errorText}`);
    }
    
    const sessions = await sessionsResponse.json();
    return normalizeSessionRows(sessions as SessionRow[]);
  } catch (error) {
    console.error('[databaseService] Error in getSessionsForUser:', error);
    throw error;
  }
}

export async function getActiveSessionByProduct(productId: string | null): Promise<VotingSession | null> {
  if (!productId) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('voting_sessions')
    .select(SESSION_SELECT)
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data ? normalizeSessionRow(data as SessionRow) : null;
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

export async function deleteVotesForFeature(sessionId: string, featureId: string): Promise<void> {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('session_id', sessionId)
    .eq('feature_id', featureId);

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

/**
 * Get all session admins for sessions of a specific product
 */
export async function getSessionAdminsForProduct(productId: string): Promise<SessionAdmin[]> {
  // First, get all sessions for this product
  const { data: sessions, error: sessionsError } = await supabase
    .from('voting_sessions')
    .select('id')
    .eq('product_id', productId);
  
  if (sessionsError) throw sessionsError;
  
  if (!sessions || sessions.length === 0) {
    return [];
  }
  
  const sessionIds = sessions.map(s => s.id);
  
  // Get all session admins for these sessions
  const { data, error } = await supabase
    .from('session_admins')
    .select(`
      *,
      users (*)
    `)
    .in('session_id', sessionIds);
  
  if (error) throw error;
  
  // Deduplicate by user email to avoid sending multiple emails to the same admin
  const adminMap = new Map<string, SessionAdmin>();
  (data || []).forEach(item => {
    const admin: SessionAdmin = {
      id: item.id,
      session_id: item.session_id,
      user_id: item.user_id,
      created_at: item.created_at,
      user: item.users as User
    };
    
    if (admin.user && admin.user.email) {
      const email = admin.user.email.toLowerCase();
      if (!adminMap.has(email)) {
        adminMap.set(email, admin);
      }
    }
  });
  
  return Array.from(adminMap.values());
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

// Convenience: add a session admin by email, creating the user if needed
export async function addSessionAdminByEmail(sessionId: string, email: string, name: string): Promise<SessionAdmin> {
  const user = await getOrCreateUser(email, name);
  return addSessionAdmin(sessionId, user.id);
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
    // System admins have admin access to all sessions
    const isSysAdmin = await isUserSystemAdmin(userId);
    if (isSysAdmin) {
      return true;
    }
    
    // Use direct fetch as workaround for Supabase client query execution issue
    const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/session_admins?session_id=eq.${sessionId}&user_id=eq.${userId}&select=id&limit=1`;
    const apiHeaders = {
      'apikey': (supabase as any).supabaseKey,
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: apiHeaders
    });
    
    if (!response.ok) {
      console.error('Error checking admin status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
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

// Convenience: ensure a stakeholder row exists for email (user account not required)
export async function addSessionStakeholderByEmail(sessionId: string, email: string, name: string): Promise<SessionStakeholder> {
  return addSessionStakeholder({
    session_id: sessionId,
    user_email: email,
    user_name: name,
    votes_allocated: 0,
    has_voted: false
  });
}

// Helper: Build a mailto link for inviting a user to a session
export function buildSessionInviteMailto(session: VotingSession & { session_code?: string }, toEmail: string, inviterName: string): string {
  // Include basename for GitHub Pages
  const basename = typeof window !== 'undefined' && window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
  const inviteUrl = `${window.location.origin}${basename}/login?session=${(session as any).session_code ?? ''}`;
  const subject = encodeURIComponent(`You're invited to vote: ${session.title}`);
  const body = encodeURIComponent(
    `Hi,\n\nYou've been invited to participate in a feature voting session.\n\n` +
    `Session: ${session.title}\n` +
    `Goal: ${session.goal}\n\n` +
    `To get started, copy and paste this link into your browser:\n\n` +
    `${inviteUrl}\n\n` +
    `Voting Period: ${session.start_date ? formatDateForEmail(session.start_date) : ''} - ${session.end_date ? formatDateForEmail(session.end_date) : ''}\n\n` +
    `Best regards,\n${inviterName}`
  );
  return `mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`;
}

function formatDateForEmail(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
    // Use direct fetch as workaround for Supabase client query execution issue
    const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/session_stakeholders?session_id=eq.${sessionId}&user_email=eq.${encodeURIComponent(email)}&select=id&limit=1`;
    const apiHeaders = {
      'apikey': (supabase as any).supabaseKey,
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: apiHeaders
    });
    
    if (!response.ok) {
      console.error('Error checking stakeholder status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error('Caught exception checking stakeholder:', err);
    return false;
  }
}

export async function isUserStakeholder(sessionId: string, email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('session_stakeholders')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_email', email.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('Error checking stakeholder status:', error);
    return false;
  }

  return !!data;
}

export async function removeStakeholder(sessionId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('session_stakeholders')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_email', email.toLowerCase());

  if (error) throw error;
}

// ============================================
// FEATURES (Session-scoped)
// ============================================

export async function getFeatures(sessionId: string) {
  // Use direct fetch as workaround for Supabase client query execution issue
  const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/features?session_id=eq.${sessionId}&select=*&order=created_at.desc`;
  const apiHeaders = {
    'apikey': (supabase as any).supabaseKey,
    'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: apiHeaders
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return (data || []).filter((feature: any) => {
    const isSuggestionState = feature.state === FEATURE_SUGGESTION_STATE;
    const hasSuggestionTag = Array.isArray(feature.tags) && feature.tags.includes(FEATURE_SUGGESTION_TAG);
    return !isSuggestionState && !hasSuggestionTag;
  });
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
// SESSION STATUS NOTES
// ============================================

function mapRowToStatusNote(row: any): SessionStatusNote {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    reason: row.reason,
    details: row.details ?? null,
    actorName: row.actor_name ?? 'Admin',
    actorId: row.actor_id ?? null,
    createdAt: row.created_at
  };
}

export async function getSessionStatusNotes(sessionId: string): Promise<SessionStatusNote[]> {
  try {
    const { data, error } = await supabase
      .from('session_status_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToStatusNote);
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.warn('[databaseService] session_status_notes table not found; status notes will not persist.', error);
      return [];
    }
    throw error;
  }
}

export async function addSessionStatusNote(note: {
  session_id: string;
  type: 'reopen' | 'ended-early';
  reason: string;
  details?: string | null;
  actor_id?: string | null;
  actor_name: string;
}): Promise<SessionStatusNote> {
  try {
    const { data, error } = await supabase
      .from('session_status_notes')
      .insert([{
        session_id: note.session_id,
        type: note.type,
        reason: note.reason,
        details: note.details ?? null,
        actor_id: note.actor_id ?? null,
        actor_name: note.actor_name
      }])
      .select('*')
      .single();

    if (error) throw error;
    return mapRowToStatusNote(data);
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.warn('[databaseService] session_status_notes table not found; status notes will not persist.', error);
      return {
        id: `temp-${Date.now()}`,
        sessionId: note.session_id,
        type: note.type,
        reason: note.reason,
        details: note.details ?? null,
        actorName: note.actor_name,
        actorId: note.actor_id ?? null,
        createdAt: new Date().toISOString()
      };
    }
    throw error;
  }
}

// ============================================
// VOTES (Session-scoped)
// ============================================

export async function getVotes(sessionId: string) {
  // Use direct fetch as workaround for Supabase client query execution issue
  const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/votes?session_id=eq.${sessionId}&select=*`;
  const apiHeaders = {
    'apikey': (supabase as any).supabaseKey,
    'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: apiHeaders
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
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

export async function deleteVotesByUser(
  sessionId: string, 
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting user votes:', error);
    throw error;
  }
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
    
    // First try update existing row by session_id without forcing single-object response
    const { data: updatedRows, error: updateError } = await supabase
      .from('azure_devops_config')
      .update(dbConfig)
      .eq('session_id', sessionId)
      .select();

    if (!updateError && updatedRows && updatedRows.length > 0) {
      return updatedRows[0];
    }

    // If no existing row, try upsert on session_id (avoids 409s when supported by constraint)
        const { data: upserted, error: upsertError } = await supabase
        .from('azure_devops_config')
        .upsert([dbConfig])  // ✅ Auto-detects unique constraint
        .select()
        .single();

    if (!upsertError) return upserted;

    // If upsert still reports duplicate (race window / constraint behavior), fetch existing and return it
    if ((upsertError as any)?.code === '23505') {
      const { data: existing, error: fetchError } = await supabase
        .from('azure_devops_config')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      return existing;
    }

    // Any other error
    throw upsertError || updateError;
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

export async function updateVotingSessionById(id: string, updates: Partial<DbVotingSession>) {
  return updateSession(id, updates);
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

export async function createFeatureSuggestion(suggestion: {
  session_id: string;
  title: string;
  description?: string | null;
  requester_id?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  whatWouldItDo?: string | null;
  howWouldItWork?: string | null;
}): Promise<FeatureSuggestion> {
  const payload = {
    summary: suggestion.description ?? null,
    whatWouldItDo: suggestion.whatWouldItDo ?? null,
    howWouldItWork: suggestion.howWouldItWork ?? null,
    requesterId: suggestion.requester_id ?? null,
    requesterName: suggestion.requester_name ?? null,
    requesterEmail: suggestion.requester_email ?? null
  };

  const { data, error } = await supabase
    .from('features')
    .insert([{
      session_id: suggestion.session_id,
      title: suggestion.title,
      description: JSON.stringify(payload),
      epic: null,
      state: FEATURE_SUGGESTION_STATE,
      area_path: null,
      tags: [FEATURE_SUGGESTION_TAG],
      azure_devops_id: null,
      azure_devops_url: null
    }])
    .select('id, session_id, title, description, created_at')
    .single();

  if (error) throw error;
  return mapRowToSuggestion(data);
}

export async function updateFeatureSuggestion(id: string, updates: {
  title?: string;
  summary?: string | null;
  whatWouldItDo?: string | null;
  howWouldItWork?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
}): Promise<FeatureSuggestion> {
  const { data: existing, error: fetchError } = await supabase
    .from('features')
    .select('id, title, description, session_id, created_at')
    .eq('id', id)
    .eq('state', FEATURE_SUGGESTION_STATE)
    .single();

  if (fetchError) throw fetchError;

  let payload: any = {};
  if (existing?.description) {
    try {
      payload = JSON.parse(existing.description);
    } catch (error) {
      console.warn('[databaseService] Unable to parse suggestion payload during update', error);
    }
  }

  const nextPayload = {
    summary: updates.summary ?? payload.summary ?? null,
    whatWouldItDo: updates.whatWouldItDo ?? payload.whatWouldItDo ?? null,
    howWouldItWork: updates.howWouldItWork ?? payload.howWouldItWork ?? null,
    requesterId: payload.requesterId ?? null,
    requesterName: updates.requester_name ?? payload.requesterName ?? null,
    requesterEmail: updates.requester_email ?? payload.requesterEmail ?? null
  };

  const { data, error } = await supabase
    .from('features')
    .update({
      title: updates.title ?? existing.title,
      description: JSON.stringify(nextPayload)
    })
    .eq('id', id)
    .eq('state', FEATURE_SUGGESTION_STATE)
    .select('id, session_id, title, description, created_at')
    .single();

  if (error) throw error;
  return mapRowToSuggestion(data);
}

export async function deleteFeatureSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('features')
    .delete()
    .eq('id', id)
    .eq('state', FEATURE_SUGGESTION_STATE);

  if (error) throw error;
}

export async function moveFeatureSuggestionToSession(id: string, targetSessionId: string): Promise<FeatureSuggestion> {
  const { data, error } = await supabase
    .from('features')
    .update({ session_id: targetSessionId })
    .eq('id', id)
    .eq('state', FEATURE_SUGGESTION_STATE)
    .select('id, session_id, title, description, created_at')
    .single();

  if (error) throw error;
  return mapRowToSuggestion(data);
}

export async function promoteSuggestionToFeature(id: string): Promise<DbFeature> {
  const { data: existing, error: fetchError } = await supabase
    .from('features')
    .select('*')
    .eq('id', id)
    .eq('state', FEATURE_SUGGESTION_STATE)
    .single();

  if (fetchError) throw fetchError;

  let payload: any = {};
  if (existing?.description) {
    try {
      payload = JSON.parse(existing.description);
    } catch (error) {
      console.warn('[databaseService] Unable to parse suggestion payload during promotion', error);
    }
  }

  const descriptionSections: string[] = [];
  if (payload.summary) descriptionSections.push(payload.summary);
  if (payload.whatWouldItDo) {
    descriptionSections.push(`What would it do?\n${payload.whatWouldItDo}`);
  }
  if (payload.howWouldItWork) {
    descriptionSections.push(`How would it work?\n${payload.howWouldItWork}`);
  }

  const updatedTags = Array.isArray(existing.tags)
    ? (existing.tags as string[]).filter(tag => tag !== FEATURE_SUGGESTION_TAG)
    : [];

  const { data, error: updateError } = await supabase
    .from('features')
    .update({
      description: descriptionSections.join('\n\n') || existing.title,
      state: null,
      tags: updatedTags
    })
    .eq('id', id)
    .eq('state', FEATURE_SUGGESTION_STATE)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return data as DbFeature;
}

export async function getFeatureSuggestions(sessionId: string): Promise<FeatureSuggestion[]> {
  const { data, error } = await supabase
    .from('features')
    .select('id, session_id, title, description, created_at, state, tags')
    .eq('session_id', sessionId)
    .eq('state', FEATURE_SUGGESTION_STATE)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToSuggestion);
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
    // Use direct fetch as workaround for Supabase client query execution issue
    const apiUrl = `${(supabase as any).supabaseUrl}/rest/v1/system_admins?user_id=eq.${userId}&select=id&limit=1`;
    const apiHeaders = {
      'apikey': (supabase as any).supabaseKey,
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: apiHeaders
    });
    
    if (!response.ok) {
      console.error('Error checking system admin status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error('Caught exception checking system admin:', err);
    return false;
  }
}