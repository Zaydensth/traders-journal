import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, PlusCircle, FileText, BarChart2,
  AlertTriangle, BookOpen, Settings, TrendingUp
} from 'lucide-react';
import { storage } from '../utils/storage';
import { getDisciplineScore } from '../utils/calculations';

export default function Sidebar() {
  const location = useLocation();
  const [score, setScore] = useState(100);

  useEffect(() => {
    const trades = storage.getTrades();
    setScore(getDisciplineScore(trades));
  }, []);

  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (score / 100) * circumference;

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

      {/* Bottom Widget — Pro Tip on Add Trade, Discipline Score elsewhere */}
      {location.pathname === '/add-trade' ? (
        <div className="sidebar-pro-tip">
          <div className="sidebar-widget-title">💡 Pro Tip</div>
          <p>Always define your stop loss before entering a trade. Risk only 1–2% of capital per trade.</p>
        </div>
      ) : (
        <div className="sidebar-discipline">
          <div className="sidebar-widget-title">Discipline Score</div>
          <div className="discipline-circle">
            <svg viewBox="0 0 100 100">
              <circle className="bg" cx="50" cy="50" r="38" />
              <circle
                className="progress"
                cx="50" cy="50" r="38"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="discipline-value">
              <div className="number">{score}</div>
              <div className="total">/ 100</div>
            </div>
          </div>
          <div className="discipline-weekly">
            ▲ +7 pts this week
          </div>
        </div>
      )}
    </aside>
  );
}
