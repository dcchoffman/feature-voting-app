// ============================================
// TeamsContext.tsx - Teams Environment Detection
// ============================================
// Location: src/contexts/TeamsContext.tsx
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';

interface TeamsContextType {
  inTeams: boolean;
  teamsContext: microsoftTeams.app.Context | null;
  isInitialized: boolean;
  teamsTheme: string | null;
}

const TeamsContext = createContext<TeamsContextType>({
  inTeams: false,
  teamsContext: null,
  isInitialized: false,
  teamsTheme: null
});

export const useTeams = () => useContext(TeamsContext);

interface TeamsProviderProps {
  children: ReactNode;
}

export const TeamsProvider: React.FC<TeamsProviderProps> = ({ children }) => {
  const [inTeams, setInTeams] = useState(false);
  const [teamsContext, setTeamsContext] = useState<microsoftTeams.app.Context | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [teamsTheme, setTeamsTheme] = useState<string | null>(null);

  useEffect(() => {
    const initializeTeams = async () => {
      try {
        // Check if we're running in Teams
        const urlParams = new URLSearchParams(window.location.search);
        const isInTeams = urlParams.get('inTeams') === 'true' || window.parent !== window;

        if (isInTeams) {
          console.log('🟢 Initializing Teams SDK...');
          
          // Initialize Teams SDK
          await microsoftTeams.app.initialize();
          
          // Get Teams context
          const context = await microsoftTeams.app.getContext();
          console.log('✅ Teams context:', context);
          
          setInTeams(true);
          setTeamsContext(context);
          setTeamsTheme(context.app.theme);
          
          // Register theme change handler
          microsoftTeams.app.registerOnThemeChangeHandler((theme: string) => {
            setTeamsTheme(theme);
          });

          // Notify Teams that app is ready
          microsoftTeams.app.notifySuccess();
        }
      } catch (error) {
        console.error('❌ Teams initialization error:', error);
        setInTeams(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeTeams();
  }, []);

  return (
    <TeamsContext.Provider value={{ inTeams, teamsContext, isInitialized, teamsTheme }}>
      {children}
    </TeamsContext.Provider>
  );
};