import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AddTrade from './pages/AddTrade';
import AllTrades from './pages/AllTrades';
import Settings from './pages/Settings';
import EdgeBySetup from './pages/EdgeBySetup';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { applyTheme, getTheme } from './utils/theme';
import { storage } from './utils/storage';
import './index.css';

function ProtectedApp() {
  const { user, loading } = useAuth();

  useEffect(() => { applyTheme(getTheme()); }, []);

  useEffect(() => {
    if (user) {
      storage.setUser(user.uid);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="login-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="login-brand">
          <div className="login-logo" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--text-primary, #e2e8f0)' }}>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-trade" element={<AddTrade />} />
          <Route path="/all-trades" element={<AllTrades />} />
          <Route path="/analytics" element={<EdgeBySetup />} />
          <Route path="/mistake-log" element={<PlaceholderPage title="Mistake Log" icon="⚠️" />} />
          <Route path="/daily-review" element={<PlaceholderPage title="Daily Review" icon="📝" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>{icon} {title}</h2>
          <p>Coming in Milestone 2 & 3</p>
        </div>
      </div>
      <div className="page-content">
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{title}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>This page will be available in the next milestone.</p>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
