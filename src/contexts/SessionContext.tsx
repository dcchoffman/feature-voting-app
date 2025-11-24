// ============================================
// Session Context Provider
// ============================================
// Location: src/contexts/SessionContext.tsx
// ============================================

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import * as db from '../services/databaseService';
import { isFallbackSystemAdmin } from '../utils/systemAdmins';
import { supabase } from '../supabaseClient';
import type { VotingSession, User, SessionContextType } from '../types';

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<VotingSession | null>(null);
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStakeholder, setIsStakeholder] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roleCheckFailed, setRoleCheckFailed] = useState(false);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const hasInitialized = useRef(false);

  const refreshSessions = useCallback(async (user?: User) => {
    // Prevent infinite loops - don't refresh if already refreshing
    if (isRefreshingSessions) {
      return;
    }

    const userToUse = user || currentUser;
    if (!userToUse) {
      setSessions([]);
      setCurrentSession(prev => {
        if (prev) {
          try {
            localStorage.removeItem('voting_system_current_session');
          } catch {}
        }
        return null;
      });
      return;
    }

    setIsRefreshingSessions(true);
    try {
      const fallbackStatus = isFallbackSystemAdmin(userToUse.email);
      
      let userSessions;
      if (fallbackStatus) {
        userSessions = await db.getAllSessions();
      } else {
        userSessions = await db.getSessionsForUser(userToUse.id);
      }
      
      setSessions(userSessions);

      setCurrentSession(prev => {
        if (!prev) {
          return prev;
        }

        const matchingSession = userSessions.find(s => s.id === prev.id);

        if (!matchingSession) {
          try {
            localStorage.removeItem('voting_system_current_session');
          } catch {}
          return null;
        }

        if (matchingSession.id !== prev.id) {
          // This should never happen, but keep the previous value.
          return prev;
        }

        if (matchingSession !== prev) {
          try {
            localStorage.setItem('voting_system_current_session', matchingSession.id);
          } catch {}
          return matchingSession;
        }

        return prev;
      });
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    } finally {
      setIsRefreshingSessions(false);
    }
  }, [currentUser, isRefreshingSessions]);

  // Check for Supabase auth sessions (Azure AD)
  useEffect(() => {
    // Prevent running multiple times
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // Safety timeout to always clear loading state
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 second safety timeout

    const checkSupabaseAuth = async () => {
      try {
        // Check if we're in the middle of an OAuth callback
        const isOAuthCallback = window.location.search.includes('code=') || 
                                window.location.hash.includes('access_token') ||
                                window.location.search.includes('error=');
        
        // If OAuth callback, wait a bit for Supabase to process it
        if (isOAuthCallback) {
          // Wait for onAuthStateChange to fire (handled below)
          // But also check session after a short delay
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const email = session.user.email;
                if (email) {
                  const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
                  try {
                    const user = await db.getOrCreateUser(email.toLowerCase(), name);
                    setCurrentUser(user);
                    await refreshSessions(user);
                    
                    // Clean up hash fragment after user is loaded
                    setTimeout(() => {
                      if (window.location.hash) {
                        const cleanUrl = window.location.pathname + window.location.search;
                        window.history.replaceState(null, '', cleanUrl);
                      }
                    }, 200);
                  } catch (error) {
                    console.error('Error getting/creating user:', error);
                    // Continue anyway - don't block the app
                  }
                }
              }
            } catch (error) {
              console.error('Error in OAuth callback handler:', error);
            } finally {
              setIsLoading(false);
              clearTimeout(safetyTimeout);
            }
          }, 1000);
          return; // Don't set isLoading false yet, wait for the timeout
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is authenticated via Supabase (Azure AD)
          const email = session.user.email;
          if (email) {
            const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
            
            // Get or create user in your database
            try {
              const user = await db.getOrCreateUser(email.toLowerCase(), name);
              setCurrentUser(user);
              await refreshSessions(user);
            } catch (error) {
              console.error('Error getting/creating user:', error);
              // Continue anyway - don't block the app
            }
          }
        } else {
          // No Supabase session, check localStorage
      const storedUser = localStorage.getItem('voting_system_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
              // Try to refresh sessions, but don't block if it fails
              try {
          await refreshSessions(user);
              } catch (error) {
                console.error('Error refreshing sessions:', error);
                // Continue anyway
              }
        } catch (error) {
          console.error('Error loading stored user:', error);
          localStorage.removeItem('voting_system_user');
        }
      }
        }
      } catch (error) {
        console.error('Error checking Supabase auth:', error);
        // Fallback to localStorage
        const storedUser = localStorage.getItem('voting_system_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            // Don't try to refresh sessions if we're in error state
          } catch (err) {
            console.error('Error loading stored user:', err);
            localStorage.removeItem('voting_system_user');
          }
        }
      } finally {
        // Only set loading false if we're not in an OAuth callback
        const isOAuthCallback = window.location.search.includes('code=') || 
                                window.location.hash.includes('access_token') ||
                                window.location.search.includes('error=');
        if (!isOAuthCallback) {
      setIsLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    checkSupabaseAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const email = session.user.email;
        if (email) {
          const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
          const user = await db.getOrCreateUser(email.toLowerCase(), name);
          setCurrentUser(user);
          await refreshSessions(user);
          setIsLoading(false); // Make sure loading is false after successful sign in
          
          // Clean up any hash fragment from OAuth callback - do this after user is set
          // Use setTimeout to ensure it runs after any navigation
          setTimeout(() => {
            if (window.location.hash) {
              const cleanUrl = window.location.pathname + window.location.search;
              window.history.replaceState(null, '', cleanUrl);
            }
          }, 100);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setSessions([]);
        setCurrentSession(null);
        localStorage.removeItem('voting_system_user');
        localStorage.removeItem('voting_system_current_session');
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed, ensure user is still set
        if (!currentUser && session.user.email) {
          const email = session.user.email;
          const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
          const user = await db.getOrCreateUser(email.toLowerCase(), name);
          setCurrentUser(user);
          await refreshSessions(user);
        }
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update user roles when session or user changes
  useEffect(() => {
    const updateUserRoles = async () => {
      if (!currentSession || !currentUser) {
        setIsAdmin(false);
        setIsStakeholder(false);
        setRoleCheckFailed(false);
        return;
      }

      // Skip if we already failed to prevent infinite loop
      if (roleCheckFailed) {
        return;
      }

      try {
        const [adminStatus, stakeholderStatus] = await Promise.all([
          db.isUserSessionAdmin(currentSession.id, currentUser.id),
          db.isUserSessionStakeholder(currentSession.id, currentUser.email)
        ]);

        setIsAdmin(adminStatus);
        setIsStakeholder(stakeholderStatus);
        setRoleCheckFailed(false); // Reset on success
      } catch (error) {
        console.error('Error checking user roles:', error);
        setIsAdmin(false);
        setIsStakeholder(false);
        setRoleCheckFailed(true); // Prevent retry loop
      }
    };

    updateUserRoles();
  }, [currentSession, currentUser, roleCheckFailed]);

  useEffect(() => {
    const checkSystemAdminStatus = async () => {
      if (!currentUser) {
        setIsSystemAdmin(false);
        return;
      }

      const fallbackStatus = isFallbackSystemAdmin(currentUser.email);
      if (fallbackStatus) {
        setIsSystemAdmin(true);
        return;
      }

      try {
        const status = await db.isUserSystemAdmin(currentUser.id);
        setIsSystemAdmin(status);
      } catch (error) {
        console.error('Error checking system admin status:', error);
        setIsSystemAdmin(false);
      }
    };

    checkSystemAdminStatus();
  }, [currentUser]);

  const handleSetCurrentUser = useCallback(async (user: User | null) => {
    setCurrentUser(user);
    setRoleCheckFailed(false); // Reset role check flag when user changes
    
    if (user) {
      // Store user in localStorage
      localStorage.setItem('voting_system_user', JSON.stringify(user));
      await refreshSessions(user);
    } else {
      // Clear localStorage and sessions
      localStorage.removeItem('voting_system_user');
      setSessions([]);
      setCurrentSession(null);
      setIsSystemAdmin(false);
    }
  }, [refreshSessions]);

  const handleSetCurrentSession = useCallback((session: VotingSession | null) => {
    setCurrentSession(session);
    setRoleCheckFailed(false); // Reset role check flag when session changes
    
    if (session) {
      // Store session ID in localStorage
      localStorage.setItem('voting_system_current_session', session.id);
    } else {
      localStorage.removeItem('voting_system_current_session');
    }
  }, []);

  // Try to restore last session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (!currentUser || sessions.length === 0) return;
      
      const storedSessionId = localStorage.getItem('voting_system_current_session');
      if (storedSessionId) {
        const session = sessions.find(s => s.id === storedSessionId);
        if (session) {
          setCurrentSession(session);
        }
      }
    };

    restoreSession();
  }, [currentUser, sessions]);

  // Aggressively clean up hash fragments from OAuth callbacks
  useEffect(() => {
    const cleanupHash = () => {
      // Only remove empty hash fragments (OAuth callbacks leave '#')
      const hash = window.location.hash;
      if (hash === '#' || hash === '') {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      }
    };

    // Clean up hash on mount if present
    cleanupHash();

    // Watch for hash changes and remove empty ones
    const handleHashChange = () => {
      cleanupHash();
    };

    // Check periodically for hash fragments (in case they're added after navigation)
    const hashCheckInterval = setInterval(cleanupHash, 500);

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearInterval(hashCheckInterval);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const value: SessionContextType = {
    currentSession,
    sessions,
    currentUser,
    isAdmin,
    isStakeholder,
    isSystemAdmin,
    isLoading,
    setCurrentSession: handleSetCurrentSession,
    refreshSessions,
    setCurrentUser: handleSetCurrentUser,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}