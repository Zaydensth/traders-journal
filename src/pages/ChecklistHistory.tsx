import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sun, Moon, Bell, ChevronDown, History, BarChart3, Award,
  LayoutDashboard, Settings, FileText
} from 'lucide-react';
import type { ChecklistRun } from '../types/checklist';
import { storage } from '../utils/storage';
import { calcPnL, formatCurrency, pnlColorClass } from '../utils/calculations';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

function fmtDate(d: string): string {
  return new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChecklistHistory() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [bellRead, setBellRead] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const notifTrades = useMemo(() => storage.getTrades().slice(0, 5), []);

  useEffect(() => { setRuns(storage.getChecklistRuns()); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sorted = useMemo(() => [...runs].sort((a, b) => b.date.localeCompare(a.date)), [runs]);
  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const avg = totalRuns ? Math.round(runs.reduce((s, r) => s + r.percent, 0) / totalRuns) : 0;
    const best = totalRuns ? Math.max(...runs.map(r => r.percent)) : 0;
    return { totalRuns, avg, best };
  }, [runs]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <button className="page-back-btn" onClick={() => navigate('/trading-checklist')}>
            <ArrowLeft size={15} /> Back to Checklist
          </button>
          <h2>Checklist History</h2>
          <p>Every completed checklist run, most recent first.</p>
        </div>
        <div className="page-header-right">
          <button className="header-btn" onClick={() => { const next = toggleTheme(); setIsDark(next === 'dark'); }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="dropdown-wrap" ref={bellRef}>
            <div style={{ position: 'relative' }}>
              <button className="header-btn" onClick={() => { setShowBell(v => !v); setBellRead(true); setShowProfile(false); }}>
                <Bell size={15} />
              </button>
              {!bellRead && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, background: 'var(--red-500)', borderRadius: '50%', border: '1.5px solid var(--bg-card)', pointerEvents: 'none' }} />}
            </div>
            {showBell && (
              <div className="dropdown-panel notif-dropdown">
                <div className="notif-panel-header"><span>Recent Trades</span><span className="notif-badge">{notifTrades.length}</span></div>
                {notifTrades.map(trade => {
                  const pnl = calcPnL(trade);
                  return (
                    <div key={trade.id} className="notif-item">
                      <div className={`notif-dot-indicator ${pnl >= 0 ? 'green' : 'red'}`} />
                      <div className="notif-content">
                        <div className="notif-trade-title">{trade.instrument} · {trade.direction}</div>
                        <div className={`notif-trade-value ${pnlColorClass(pnl)}`}>{formatCurrency(pnl)}</div>
                      </div>
                      <div className="notif-trade-date">{new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  );
                })}
                {notifTrades.length === 0 && <div className="notif-empty">No trades yet</div>}
              </div>
            )}
          </div>
          <div className="dropdown-wrap" ref={profileRef}>
            <div className="user-profile-badge" onClick={() => { setShowProfile(v => !v); setShowBell(false); }}>
              <div className="user-avatar">{userInitials}</div>
              <div className="user-profile-info">
                <span className="user-profile-name">{userName}</span>
                <span className="user-profile-plan">Pro Plan</span>
              </div>
              <ChevronDown size={14} color="var(--text-secondary)" />
            </div>
            {showProfile && (
              <div className="dropdown-panel profile-dropdown">
                <div className="dropdown-user-header">
                  <div className="user-avatar" style={{ width: 38, height: 38, flexShrink: 0 }}>{userInitials}</div>
                  <div>
                    <div className="dropdown-user-name">{userName}</div>
                    <div className="dropdown-user-plan">Pro Plan · Active</div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/'); }}><LayoutDashboard size={14} /> Dashboard</button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}><Settings size={14} /> Settings</button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { logout(); }} style={{ color: 'var(--red-500)' }}><FileText size={14} /> Sign Out</button>
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="stat-cards" style={{ marginBottom: 24 }}>
          <div className="stat-card animate-in">
            <div className="stat-card-icon blue"><History size={22} /></div>
            <div className="stat-card-label">Total Completed</div>
            <div className="stat-card-value">{stats.totalRuns}</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon green"><BarChart3 size={22} /></div>
            <div className="stat-card-label">Avg Completion</div>
            <div className="stat-card-value">{stats.avg}%</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon purple"><Award size={22} /></div>
            <div className="stat-card-label">Best Run</div>
            <div className="stat-card-value">{stats.best}%</div>
          </div>
        </div>

        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title"><History size={18} color="var(--green-600)" /> All History</div>
          </div>
          <div className="card-body-np">
            {sorted.length === 0 ? (
              <div className="tc-empty">No checklist history yet. Complete a checklist to see it here.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Checklist</th>
                    <th>Score</th>
                    <th>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.date)}</td>
                      <td style={{ fontWeight: 600 }}>{r.checklistName}</td>
                      <td>{r.yes} / {r.total}</td>
                      <td>
                        <div className="hist-bar-cell">
                          <span className={`tc-recent-pct ${r.percent >= 90 ? 'good' : 'bad'}`}>{r.percent}%</span>
                          <div className="hist-bar-track">
                            <div className={`hist-bar-fill ${r.percent >= 90 ? 'good' : 'bad'}`} style={{ width: `${r.percent}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
