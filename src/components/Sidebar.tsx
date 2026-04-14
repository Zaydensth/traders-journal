import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import {
  LayoutDashboard, PlusCircle, FileText, BarChart2,
  AlertTriangle, BookOpen, Settings, TrendingUp, Lightbulb,
  RefreshCw, ClipboardList, Layers, Star
} from 'lucide-react';
import { FaSackDollar } from 'react-icons/fa6';
import { storage } from '../utils/storage';
import { getDisciplineScore, calcPnL, calcRiskReward, formatCurrency } from '../utils/calculations';
import type { Trade } from '../types/trade';

export default function Sidebar() {
  const location = useLocation();
  const [score, setScore] = useState(100);

  const [trades, setTradesData] = useState<Trade[]>([]);

  useEffect(() => {
    const data = storage.getTrades();
    setTradesData(data);
    setScore(getDisciplineScore(data));
  }, []);

  const quickStats = useMemo(() => {
    const now = new Date();
    const monthly = trades.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const wins = monthly.filter(t => calcPnL(t) >= 0).length;
    const pnl = monthly.reduce((s, t) => s + calcPnL(t), 0);
    const rrs = monthly.map(t => calcRiskReward(t)).filter(r => r > 0);
    const avgRR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;
    const setupMap: Record<string, number> = {};
    monthly.forEach(t => { setupMap[t.setup] = (setupMap[t.setup] || 0) + 1; });
    const bestSetup = Object.entries(setupMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return {
      total: monthly.length,
      winRate: monthly.length ? (wins / monthly.length) * 100 : 0,
      pnl,
      avgRR,
      bestSetup,
    };
  }, [trades]);

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

      {/* Bottom Widget — context-sensitive */}
      {location.pathname === '/add-trade' ? (
        <div className="sidebar-pro-tip">
          <div className="pro-tip-header">
            <div className="pro-tip-icon">
              <Lightbulb size={15} />
            </div>
            <span className="sidebar-widget-title" style={{ margin: 0 }}>Pro Tip</span>
          </div>
          <p>Always define your stop loss before entering a trade. Risk only 1–2% of capital per trade.</p>
        </div>
      ) : location.pathname === '/all-trades' ? (
        <div className="sidebar-quick-stats">
          <div className="sidebar-widget-title">Quick Stats</div>
          <div className="qs-period">This Month</div>
          <div className="qs-list">
            <div className="qs-row">
              <span className="qs-icon purple"><ClipboardList size={13} /></span>
              <span className="qs-label">Total Trades</span>
              <span className="qs-val">{quickStats.total}</span>
            </div>
            <div className="qs-row">
              <span className="qs-icon green"><RefreshCw size={13} /></span>
              <span className="qs-label">Win Rate</span>
              <span className="qs-val" style={{ color: 'var(--green-600)' }}>{quickStats.winRate.toFixed(1)}%</span>
            </div>
            <div className="qs-row">
              <span className="qs-icon green"><FaSackDollar size={12} /></span>
              <span className="qs-label">Net P&L</span>
              <span className={`qs-val ${quickStats.pnl >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(quickStats.pnl)}</span>
            </div>
            <div className="qs-row">
              <span className="qs-icon purple"><Layers size={13} /></span>
              <span className="qs-label">Avg R:R</span>
              <span className="qs-val">1 : {quickStats.avgRR.toFixed(2)}</span>
            </div>
            <div className="qs-row">
              <span className="qs-icon purple"><Star size={13} /></span>
              <span className="qs-label">Best Setup</span>
              <span className="qs-val">{quickStats.bestSetup}</span>
            </div>
          </div>
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
