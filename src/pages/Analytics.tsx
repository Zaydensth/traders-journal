import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Bell, ChevronDown, BarChart2, Target, TrendingUp,
  TrendingDown, CheckCircle2, AlertTriangle, Clock, BookOpen,
  Settings
} from 'lucide-react';
import type { Trade } from '../types/trade';
import { storage } from '../utils/storage';
import {
  calcPnL, calcRiskReward, formatCurrency, getDisciplineScore
} from '../utils/calculations';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

export default function Analytics() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, setIsDark] = useState(getTheme() === 'dark');
  const [timePeriod, setTimePeriod] = useState('This Month');
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTrades(storage.getTrades()); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter trades by time period
  const filteredTrades = useMemo(() => {
    const now = new Date();
    return trades.filter(t => {
      const d = new Date(t.date);
      switch (timePeriod) {
        case 'This Week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return d >= startOfWeek;
        }
        case 'This Month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'Last 3 Months': {
          const d3 = new Date(now);
          d3.setMonth(d3.getMonth() - 3);
          return d >= d3;
        }
        default: return true;
      }
    });
  }, [trades, timePeriod]);

  // Discipline Score — 6-Component Scoring Engine
  const disciplineScore = useMemo(() => getDisciplineScore(filteredTrades), [filteredTrades]);

  // Component breakdown
  const scoreBreakdown = useMemo(() => {
    const t = filteredTrades;
    if (t.length === 0) return null;

    // Trade Plan Adherence (30 pts) - trades with stop loss AND take profit AND setup defined
    const planAdherent = t.filter(tr => tr.stopLoss > 0 && tr.exitPrice > 0 && tr.setup).length;
    const planScore = Math.round((planAdherent / t.length) * 30);

    // Patience & Timing (20 pts) - trades held for reasonable time, not impulsive
    const withNotes = t.filter(tr => tr.notes && tr.notes.length > 10).length;
    const patienceScore = Math.round((withNotes / t.length) * 20);

    // Risk Management (20 pts) - proper stop loss usage
    const withSL = t.filter(tr => tr.stopLoss > 0).length;
    const riskScore = Math.round((withSL / t.length) * 20);

    // Emotional Control (15 pts) - trades with emotion logged and not "Fear" or "Greed" heavy
    const neutral = t.filter(tr => tr.emotion === 'Neutral' || tr.emotion === 'Confidence').length;
    const emotionScore = Math.round((neutral / t.length) * 15);

    // Journaling & Review (10 pts) - trades with notes
    const journaled = t.filter(tr => tr.notes && tr.notes.trim().length > 0).length;
    const journalScore = Math.round((journaled / t.length) * 10);

    // Consistency Bonus (5 pts) - consistent trading days
    const tradeDays = new Set(t.map(tr => tr.date.split('T')[0])).size;
    const consistencyScore = Math.min(5, Math.round(tradeDays / 4));

    return [
      { label: 'Trade Plan Adherence', score: planScore, max: 30, icon: <Target size={16} />, color: '#10b981' },
      { label: 'Patience & Timing', score: patienceScore, max: 20, icon: <Clock size={16} />, color: '#3b82f6' },
      { label: 'Risk Management', score: riskScore, max: 20, icon: <AlertTriangle size={16} />, color: '#f59e0b' },
      { label: 'Emotional Control', score: emotionScore, max: 15, icon: <TrendingDown size={16} />, color: '#8b5cf6' },
      { label: 'Journaling & Review', score: journalScore, max: 10, icon: <BookOpen size={16} />, color: '#06b6d4' },
      { label: 'Consistency Bonus', score: consistencyScore, max: 5, icon: <CheckCircle2 size={16} />, color: '#ec4899' },
    ];
  }, [filteredTrades]);

  // Quick stats
  const stats = useMemo(() => {
    const t = filteredTrades;
    if (t.length === 0) return null;
    const wins = t.filter(tr => calcPnL(tr) >= 0).length;
    const totalPnl = t.reduce((s, tr) => s + calcPnL(tr), 0);
    const rrs = t.map(tr => calcRiskReward(tr)).filter(r => r > 0);
    const avgRR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;
    return {
      total: t.length,
      winRate: (wins / t.length) * 100,
      pnl: totalPnl,
      avgRR,
    };
  }, [filteredTrades]);

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (disciplineScore / 100) * circumference;
  const scoreColor = disciplineScore >= 70 ? 'var(--green-500)' : disciplineScore >= 40 ? '#f59e0b' : 'var(--red-500)';

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Analytics</h2>
          <p>Track your discipline score and trading performance.</p>
        </div>
        <div className="page-header-right">
          <div className="select-wrapper">
            <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)} className="header-select">
              <option>This Week</option>
              <option>This Month</option>
              <option>Last 3 Months</option>
              <option>All Time</option>
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>
          <button className="header-btn icon-only" onClick={() => { toggleTheme(); setIsDark(!isDark); }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="header-btn icon-only"><Bell size={18} /></div>
          <div className="dropdown-wrap" ref={profileRef}>
            <div className="user-profile-badge" onClick={() => setShowProfile(v => !v)}>
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
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/'); }}><BarChart2 size={14} /> Dashboard</button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}><Settings size={14} /> Settings</button>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={() => { setShowProfile(false); logout(); }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* DISCIPLINE SCORE — Main card */}
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">
              <Target size={18} color="var(--green-500)" /> Discipline Score — 6-Component Scoring Engine
            </div>
          </div>

          {filteredTrades.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--text-primary)' }}>No Trades Yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Add trades to see your discipline score breakdown.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32, alignItems: 'center' }}>
              {/* Score circle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-light)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke={scoreColor} strokeWidth="8"
                      strokeDasharray={circumference} strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 0.8s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: scoreColor }}>{disciplineScore}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  Based on {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {scoreBreakdown?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: item.color, flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color }}>{item.score}/{item.max} pts</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(item.score / item.max) * 100}%`, background: item.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="card animate-in" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={18} color="var(--green-500)" /> Performance Summary
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div className="setup-detail-item">
                <span>Total Trades</span>
                <strong>{stats.total}</strong>
              </div>
              <div className="setup-detail-item">
                <span>Win Rate</span>
                <strong className={stats.winRate >= 50 ? 'positive' : 'negative'}>{stats.winRate.toFixed(1)}%</strong>
              </div>
              <div className="setup-detail-item">
                <span>Net P&L</span>
                <strong className={stats.pnl >= 0 ? 'positive' : 'negative'}>{formatCurrency(stats.pnl)}</strong>
              </div>
              <div className="setup-detail-item">
                <span>Avg R:R</span>
                <strong>1:{stats.avgRR.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
