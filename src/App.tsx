import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GlobalSettings from './pages/config/GlobalSettings';
import PlmnIdentity from './pages/config/PlmnIdentity';
import SbiTopology from './pages/config/SbiTopology';
import SessionUpf from './pages/config/SessionUpf';
import Epc4g from './pages/config/Epc4g';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(state => state.session);
  const initialized = useAuthStore(state => state.initialized);
  if (!initialized) return null;
  if (!session?.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const init = useAuthStore(state => state.init);
  const initialized = useAuthStore(state => state.initialized);

  useEffect(() => { init(); }, [init]);

  if (!initialized) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="config/global" element={<GlobalSettings />} />
        <Route path="config/plmn" element={<PlmnIdentity />} />
        <Route path="config/sbi" element={<SbiTopology />} />
        <Route path="config/session" element={<SessionUpf />} />
        <Route path="config/epc" element={<Epc4g />} />
      </Route>
    </Routes>
  );
}
