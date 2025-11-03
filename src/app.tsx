// ============================================
// App.tsx - Main Application Router (Phase 2 Complete)
// ============================================
// Location: src/App.tsx
// ============================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import LoginScreen from './screens/LoginScreen';
import SessionSelectionScreen from './screens/SessionSelectionScreen';
import CreateSessionScreen from './screens/CreateSessionScreen';
import StakeholderManagementScreen from './screens/StakeholderManagementScreen';
import AdminManagementScreen from './screens/AdminManagementScreen';
import FeatureVotingSystem from './components/FeatureVotingSystem';
import UnauthorizedScreen from './screens/UnauthorizedScreen';
import SystemAdminsScreen from './screens/SystemAdminsScreen';
import UsersManagementScreen from './screens/UsersManagementScreen';
import DecorativeLines from './components/DecorativeLines';

function App() {
  return (
    <SessionProvider>
      <DecorativeLines />
      <BrowserRouter basename="/feature-voting-app">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/sessions" element={<SessionSelectionScreen />} />
          <Route path="/create-session" element={<CreateSessionScreen />} />
          <Route path="/manage-stakeholders" element={<StakeholderManagementScreen />} />
          <Route path="/manage-admins" element={<AdminManagementScreen />} />
          <Route path="/vote" element={<FeatureVotingSystem adminMode={false} />} />
          <Route path="/admin" element={<FeatureVotingSystem adminMode={true} />} />
          <Route path="/results" element={<FeatureVotingSystem resultsMode={true} />} /> 
          <Route path="/unauthorized" element={<UnauthorizedScreen />} />
          <Route path="/system-admins" element={<SystemAdminsScreen />} />
          <Route path="/users" element={<UsersManagementScreen />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;