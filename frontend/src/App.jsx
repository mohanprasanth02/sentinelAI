import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AnomalyToast from './components/AnomalyToast';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMonitor from './pages/LiveMonitor';
import BehaviourAnalytics from './pages/BehaviourAnalytics';
import PrivilegedActivity from './pages/PrivilegedActivity';
import AIThreatDetection from './pages/AIThreatDetection';
import IncidentManagement from './pages/IncidentManagement';
import QuantumSafe from './pages/QuantumSafe';
import Settings from './pages/Settings';
import Directory from './pages/Directory';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-cyber-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-t-cyan-400 border-white/10 rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-cyan-400 tracking-widest animate-pulse">VERIFYING SOC SESSION...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppLayout = () => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-gradient selection:bg-cyan-500/30">
      {user && <Sidebar />}
      <main
        className={`flex-grow h-screen overflow-y-auto ${user ? 'pl-64' : ''} p-8`}
        style={{
          /* Explicit GPU compositor layer for the scroll container */
          willChange: 'scroll-position',
          /* Enable hardware-accelerated scroll on Chrome/Firefox */
          WebkitOverflowScrolling: 'touch',
          /* Contain layout so child changes don't cause full-page recalculation */
          contain: 'layout',
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst', 'Privileged User']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/monitor" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst']}>
              <LiveMonitor />
            </ProtectedRoute>
          } />

          <Route path="/behaviour" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst']}>
              <BehaviourAnalytics />
            </ProtectedRoute>
          } />

          <Route path="/privileged" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst', 'Privileged User']}>
              <PrivilegedActivity />
            </ProtectedRoute>
          } />

          <Route path="/ai-predict" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst']}>
              <AIThreatDetection />
            </ProtectedRoute>
          } />

          <Route path="/incidents" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst']}>
              <IncidentManagement />
            </ProtectedRoute>
          } />

          <Route path="/quantum" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst', 'Privileged User']}>
              <QuantumSafe />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/directory" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Security Analyst']}>
              <Directory />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating Notifications */}
      <AnomalyToast />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
