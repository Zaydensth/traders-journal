import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, FileText, BarChart2,
  AlertTriangle, BookOpen, Settings, TrendingUp
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <TrendingUp size={20} color="#fff" />
        </div>
        <h1>
          Trader's
          <span>Journal</span>
        </h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
          <span className="sidebar-icon"><LayoutDashboard size={18} /></span>
          Dashboard
        </NavLink>
        <NavLink to="/add-trade" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon"><PlusCircle size={18} /></span>
          Add Trade
        </NavLink>
        <NavLink to="/all-trades" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon"><FileText size={18} /></span>
          All Trades
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon"><BarChart2 size={18} /></span>
          Analytics
        </NavLink>
        <NavLink to="/mistake-log" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon"><AlertTriangle size={18} /></span>
          Mistake Log
        </NavLink>
        <NavLink to="/daily-review" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon"><BookOpen size={18} /></span>
          Daily Review
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-icon"><Settings size={18} /></span>
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
