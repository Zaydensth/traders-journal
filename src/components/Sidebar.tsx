import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📊</div>
        <h1>
          Trader's
          <span>Journal</span>
        </h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
          <span className="sidebar-icon">📋</span>
          Dashboard
        </NavLink>
        <NavLink to="/add-trade" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon">➕</span>
          Add Trade
        </NavLink>
        <NavLink to="/all-trades" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon">📄</span>
          All Trades
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon">📈</span>
          Analytics
        </NavLink>
        <NavLink to="/mistake-log" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon">⚠️</span>
          Mistake Log
        </NavLink>
        <NavLink to="/daily-review" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon">📝</span>
          Daily Review
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon">⚙️</span>
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
