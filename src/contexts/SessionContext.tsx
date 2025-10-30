// ============================================
// Session Context Provider
// ============================================
// Location: src/contexts/SessionContext.tsx
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as db from '../services/databaseService';
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
  const [isLoading, setIsLoading] = useState(true);
  const [roleCheckFailed, setRoleCheckFailed] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      const storedUser = localStorage.getItem('voting_system_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          await refreshSessions(user);
        } catch (error) {
          console.error('Error loading stored user:', error);
          localStorage.removeItem('voting_system_user');
        }
      }
      setIsLoading(false);
    };

    loadStoredUser();
  }, []);

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

  const refreshSessions = useCallback(async (user?: User) => {
    const userToUse = user || currentUser;
    if (!userToUse) {
      setSessions([]);
      return;
    }

    try {
      const userSessions = await db.getSessionsForUser(userToUse.id);
      setSessions(userSessions);
      
      // If current session is not in the list, clear it
      if (currentSession && !userSessions.find(s => s.id === currentSession.id)) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  }, [currentUser, currentSession]);

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

  const value: SessionContextType = {
    currentSession,
    sessions,
    currentUser,
    isAdmin,
    isStakeholder,
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