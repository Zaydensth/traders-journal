import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-trade" element={<PlaceholderPage title="Add Trade" icon="➕" />} />
            <Route path="/all-trades" element={<PlaceholderPage title="All Trades" icon="📄" />} />
            <Route path="/analytics" element={<PlaceholderPage title="Analytics" icon="📈" />} />
            <Route path="/mistake-log" element={<PlaceholderPage title="Mistake Log" icon="⚠️" />} />
            <Route path="/daily-review" element={<PlaceholderPage title="Daily Review" icon="📝" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" icon="⚙️" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
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

export default App;
