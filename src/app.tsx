// ============================================
// App.tsx - Main Application Router with Teams Integration
// ============================================
// Location: src/App.tsx
// ============================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { TeamsProvider } from './contexts/TeamsContext';
import LoginScreen from './screens/LoginScreen';
import SessionSelectionScreen from './screens/SessionSelectionScreen';
import FeatureVotingSystem from './screens/FeatureVoting';
import UnauthorizedScreen from './screens/UnauthorizedScreen';
import SystemAdminsScreen from './screens/SystemAdminsScreen';
import UsersManagementScreen from './screens/UsersManagementScreen';
import UsersManagementScreenMultiRow from './screens/UsersManagementScreen_MultiRow';
import DecorativeLines from './components/DecorativeLines';

function App() {
  return (
    <TeamsProvider>
      <SessionProvider>
        <DecorativeLines />
        <BrowserRouter basename="/feature-voting-app">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/sessions" element={<SessionSelectionScreen />} />
            <Route path="/vote" element={<FeatureVotingSystem adminMode={false} />} />
            <Route path="/admin" element={<FeatureVotingSystem adminMode={true} />} />
            <Route path="/results" element={<FeatureVotingSystem resultsMode={true} />} /> 
            <Route path="/unauthorized" element={<UnauthorizedScreen />} />
            <Route path="/system-admins" element={<SystemAdminsScreen />} />
            <Route path="/users" element={<UsersManagementScreen />} />
            <Route path="/users-multirow" element={<UsersManagementScreenMultiRow />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </TeamsProvider>
  );
}

export default App;