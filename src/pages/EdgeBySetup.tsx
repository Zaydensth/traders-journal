import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Bell, ChevronDown, Plus, X, Trash2,
  TrendingUp, TrendingDown, Target, Shield, Clock,
  BarChart2, CheckCircle2, AlertTriangle, Zap
} from 'lucide-react';
import { storage } from '../utils/storage';
import { calcPnL, calcRiskReward, formatCurrency, getDisciplineBreakdown } from '../utils/calculations';
import type { Trade, CustomSetup } from '../types/trade';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

const SETUP_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
];

interface SetupDetail {
  setup: string;
  trades: Trade[];
  wins: number;
  losses: number;
  winRate: number;
  avgRR: number;
  pnl: number;
  bestTrade: number;
  worstTrade: number;
  avgPnL: number;
  streak: number;
  color: string;
}

export default function EdgeBySetup() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, setIsDark] = useState(getTheme() === 'dark');
  const [selectedSetup, setSelectedSetup] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTrades(storage.getTrades());
    setCustomSetups(storage.getCustomSetups());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const setupDetails = useMemo((): SetupDetail[] => {
    const map = new Map<string, Trade[]>();
    trades.forEach(t => {
      if (!map.has(t.setup)) map.set(t.setup, []);
      map.get(t.setup)!.push(t);
    });

    return Array.from(map.entries()).map(([setup, tds], i) => {
      const wins = tds.filter(t => calcPnL(t) > 0);
      const losses = tds.filter(t => calcPnL(t) <= 0);
      const pnls = tds.map(t => calcPnL(t));
      const rrs = tds.map(t => calcRiskReward(t)).filter(r => r > 0);
      const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

      // Current winning streak
      let streak = 0;
      const sorted = tds.sort((a, b) => b.date.localeCompare(a.date));
      for (const t of sorted) {
        if (calcPnL(t) > 0) streak++;
        else break;
      }

      const custom = customSetups.find(cs => cs.name === setup);

      return {
        setup,
        trades: tds,
        wins: wins.length,
        losses: losses.length,
        winRate: (wins.length / tds.length) * 100,
        avgRR,
        pnl: pnls.reduce((a, b) => a + b, 0),
        bestTrade: Math.max(...pnls),
        worstTrade: Math.min(...pnls),
        avgPnL: pnls.reduce((a, b) => a + b, 0) / pnls.length,
        streak,
        color: custom?.color || SETUP_COLORS[i % SETUP_COLORS.length],
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [trades, customSetups]);

  const discipline = useMemo(() => getDisciplineBreakdown(trades), [trades]);

  const selectedDetail = selectedSetup ? setupDetails.find(s => s.setup === selectedSetup) : null;

  // Add new setup modal state
  const [modalForm, setModalForm] = useState({
    name: '', description: '', entryRules: [''], exitRules: [''], slRules: [''],
    timeframes: [] as string[], color: SETUP_COLORS[0],
  });

  function handleAddRule(field: 'entryRules' | 'exitRules' | 'slRules') {
    setModalForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  }
  function handleRemoveRule(field: 'entryRules' | 'exitRules' | 'slRules', idx: number) {
    setModalForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  }
  function handleRuleChange(field: 'entryRules' | 'exitRules' | 'slRules', idx: number, val: string) {
    setModalForm(prev => {
      const updated = [...prev[field]];
      updated[idx] = val;
      return { ...prev, [field]: updated };
    });
  }
  function toggleTimeframe(tf: string) {
    setModalForm(prev => ({
      ...prev,
      timeframes: prev.timeframes.includes(tf) ? prev.timeframes.filter(t => t !== tf) : [...prev.timeframes, tf],
    }));
  }

  function handleSaveSetup() {
    if (!modalForm.name.trim()) return;
    const newSetup: CustomSetup = {
      id: storage.generateId(),
      name: modalForm.name.trim(),
      description: modalForm.description.trim(),
      entryRules: modalForm.entryRules.filter(r => r.trim()),
      exitRules: modalForm.exitRules.filter(r => r.trim()),
      slRules: modalForm.slRules.filter(r => r.trim()),
      timeframes: modalForm.timeframes,
      color: modalForm.color,
      createdAt: new Date().toISOString(),
    };
    const updated = [...customSetups, newSetup];
    setCustomSetups(updated);
    storage.saveCustomSetups(updated);
    setShowModal(false);
    setModalForm({ name: '', description: '', entryRules: [''], exitRules: [''], slRules: [''], timeframes: [], color: SETUP_COLORS[(updated.length) % SETUP_COLORS.length] });
  }

  function handleDeleteSetup(id: string) {
    if (!window.confirm('Delete this custom setup?')) return;
    const updated = customSetups.filter(s => s.id !== id);
    setCustomSetups(updated);
    storage.saveCustomSetups(updated);
  }

  const allTimeframes = ['1 Minute', '5 Minute', '15 Minute', '30 Minute', '1 Hour', '4 Hour', 'Daily'];

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Edge by Setup</h2>
          <p>Analyze performance across your trading setups</p>
        </div>
        <div className="page-header-right">
          <button className="header-btn add-trade-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Setup
          </button>
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
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}><Shield size={14} /> Settings</button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { logout(); }} style={{ color: 'var(--red-500)' }}><X size={14} /> Sign Out</button>
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* DISCIPLINE SCORE OVERVIEW */}
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title"><Target size={18} color="var(--green-600)" /> Discipline Score</div>
            <div className="discipline-overall-badge">
              <span className="discipline-overall-number">{discipline.overall}</span>/100
            </div>
          </div>
          <div className="discipline-grid">
            {discipline.components.map(comp => (
              <div key={comp.name} className="discipline-comp-card">
                <div className="discipline-comp-icon">{comp.icon}</div>
                <div className="discipline-comp-info">
                  <div className="discipline-comp-name">{comp.name}</div>
                  <div className="discipline-comp-desc">{comp.description}</div>
                </div>
                <div className="discipline-comp-score">
                  <div className="discipline-comp-bar">
                    <div className="discipline-comp-bar-fill" style={{
                      width: `${(comp.score / comp.maxScore) * 100}%`,
                      background: comp.score / comp.maxScore > 0.7 ? 'var(--green-500)' : comp.score / comp.maxScore > 0.4 ? 'var(--orange-500)' : 'var(--red-500)',
                    }} />
                  </div>
                  <span className="discipline-comp-val">{comp.score}/{comp.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SETUP CARDS GRID */}
        {setupDetails.length === 0 ? (
          <div className="card animate-in" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--text-primary)' }}>No Setups Yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Start adding trades with setups to see your edge analysis here.</p>
            <button className="header-btn add-trade-btn" onClick={() => navigate('/add-trade')}><Plus size={16} /> Add Your First Trade</button>
          </div>
        ) : (
          <div className="setup-cards-grid">
            {setupDetails.map(detail => (
              <div
                key={detail.setup}
                className={`setup-card animate-in ${selectedSetup === detail.setup ? 'active' : ''}`}
                onClick={() => setSelectedSetup(selectedSetup === detail.setup ? null : detail.setup)}
                style={{ borderTop: `3px solid ${detail.color}` }}
              >
                <div className="setup-card-header">
                  <div className="setup-card-name" style={{ color: detail.color }}>{detail.setup}</div>
                  <div className={`setup-card-pnl ${detail.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(detail.pnl)}
                  </div>
                </div>
                <div className="setup-card-stats">
                  <div className="setup-stat">
                    <span className="setup-stat-label">Win Rate</span>
                    <span className="setup-stat-val" style={{ color: detail.winRate >= 50 ? 'var(--green-500)' : 'var(--red-500)' }}>
                      {detail.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="setup-stat">
                    <span className="setup-stat-label">Trades</span>
                    <span className="setup-stat-val">{detail.trades.length}</span>
                  </div>
                  <div className="setup-stat">
                    <span className="setup-stat-label">Avg R:R</span>
                    <span className="setup-stat-val">1 : {detail.avgRR.toFixed(2)}</span>
                  </div>
                  <div className="setup-stat">
                    <span className="setup-stat-label">Streak</span>
                    <span className="setup-stat-val" style={{ color: 'var(--green-500)' }}>
                      {detail.streak > 0 ? `${detail.streak}W` : '—'}
                    </span>
                  </div>
                </div>
                <div className="setup-card-bar">
                  <div className="setup-card-bar-win" style={{ width: `${detail.winRate}%` }} />
                </div>
                <div className="setup-card-wl">
                  <span className="positive">{detail.wins}W</span>
                  <span className="negative">{detail.losses}L</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SELECTED SETUP DETAIL */}
        {selectedDetail && (
          <div className="card animate-in" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title" style={{ color: selectedDetail.color }}>
                <Zap size={18} /> {selectedDetail.setup} — Detailed Analysis
              </div>
            </div>
            <div className="setup-detail-grid">
              <div className="setup-detail-item">
                <TrendingUp size={16} color="var(--green-500)" />
                <span>Best Trade</span>
                <strong className="positive">{formatCurrency(selectedDetail.bestTrade)}</strong>
              </div>
              <div className="setup-detail-item">
                <TrendingDown size={16} color="var(--red-500)" />
                <span>Worst Trade</span>
                <strong className="negative">{formatCurrency(selectedDetail.worstTrade)}</strong>
              </div>
              <div className="setup-detail-item">
                <BarChart2 size={16} color="var(--text-secondary)" />
                <span>Avg P&L</span>
                <strong className={selectedDetail.avgPnL >= 0 ? 'positive' : 'negative'}>{formatCurrency(selectedDetail.avgPnL)}</strong>
              </div>
              <div className="setup-detail-item">
                <Target size={16} color="var(--text-secondary)" />
                <span>Win Rate</span>
                <strong>{selectedDetail.winRate.toFixed(1)}%</strong>
              </div>
            </div>
            {/* Recent trades for this setup */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Recent Trades</h4>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Instrument</th><th>Direction</th><th>Entry → Exit</th><th>P&L</th></tr>
                </thead>
                <tbody>
                  {selectedDetail.trades.slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td style={{ fontWeight: 600 }}>{t.instrument}</td>
                      <td><span className={`direction-badge ${t.direction.toLowerCase()}`}>{t.direction}</span></td>
                      <td>{t.entryPrice.toLocaleString()} → {t.exitPrice.toLocaleString()}</td>
                      <td><span className={calcPnL(t) >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>{formatCurrency(calcPnL(t))}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOM SETUPS LIST */}
        {customSetups.length > 0 && (
          <div className="card animate-in" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title"><Shield size={18} color="var(--purple-500, #8b5cf6)" /> Custom Setup Rules</div>
            </div>
            <div className="custom-setups-list">
              {customSetups.map(cs => (
                <div key={cs.id} className="custom-setup-item" style={{ borderLeft: `3px solid ${cs.color}` }}>
                  <div className="custom-setup-header">
                    <strong>{cs.name}</strong>
                    <button className="custom-setup-delete" onClick={() => handleDeleteSetup(cs.id)}><Trash2 size={14} /></button>
                  </div>
                  {cs.description && <p className="custom-setup-desc">{cs.description}</p>}
                  <div className="custom-setup-rules">
                    {cs.entryRules.length > 0 && (
                      <div><span className="rule-label">Entry:</span> {cs.entryRules.map((r, i) => <span key={i} className="rule-tag green">{r}</span>)}</div>
                    )}
                    {cs.slRules.length > 0 && (
                      <div><span className="rule-label">SL:</span> {cs.slRules.map((r, i) => <span key={i} className="rule-tag red">{r}</span>)}</div>
                    )}
                    {cs.exitRules.length > 0 && (
                      <div><span className="rule-label">Target:</span> {cs.exitRules.map((r, i) => <span key={i} className="rule-tag blue">{r}</span>)}</div>
                    )}
                  </div>
                  {cs.timeframes.length > 0 && (
                    <div className="custom-setup-tfs">
                      <Clock size={12} /> {cs.timeframes.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ADD NEW SETUP MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Setup</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Setup Name *</label>
                <input type="text" placeholder="e.g. Opening Range Breakout" value={modalForm.name}
                  onChange={e => setModalForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="modal-field">
                <label>Description</label>
                <textarea placeholder="Brief description of this setup..." value={modalForm.description}
                  onChange={e => setModalForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              <div className="modal-field">
                <label>Color</label>
                <div className="color-picker-row">
                  {SETUP_COLORS.map(c => (
                    <button key={c} className={`color-swatch ${modalForm.color === c ? 'active' : ''}`}
                      style={{ background: c }} onClick={() => setModalForm(p => ({ ...p, color: c }))} />
                  ))}
                </div>
              </div>

              <div className="modal-rules-section">
                <label><CheckCircle2 size={14} color="var(--green-500)" /> Entry Rules</label>
                {modalForm.entryRules.map((rule, i) => (
                  <div key={i} className="modal-rule-row">
                    <input type="text" placeholder={`Rule ${i + 1}...`} value={rule}
                      onChange={e => handleRuleChange('entryRules', i, e.target.value)} />
                    {modalForm.entryRules.length > 1 && (
                      <button className="rule-remove-btn" onClick={() => handleRemoveRule('entryRules', i)}><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button className="rule-add-btn" onClick={() => handleAddRule('entryRules')}><Plus size={14} /> Add Rule</button>
              </div>

              <div className="modal-rules-section">
                <label><AlertTriangle size={14} color="var(--red-500)" /> Stop Loss Rules</label>
                {modalForm.slRules.map((rule, i) => (
                  <div key={i} className="modal-rule-row">
                    <input type="text" placeholder={`SL Rule ${i + 1}...`} value={rule}
                      onChange={e => handleRuleChange('slRules', i, e.target.value)} />
                    {modalForm.slRules.length > 1 && (
                      <button className="rule-remove-btn" onClick={() => handleRemoveRule('slRules', i)}><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button className="rule-add-btn" onClick={() => handleAddRule('slRules')}><Plus size={14} /> Add Rule</button>
              </div>

              <div className="modal-rules-section">
                <label><Target size={14} color="var(--blue-500, #3b82f6)" /> Target / Exit Rules</label>
                {modalForm.exitRules.map((rule, i) => (
                  <div key={i} className="modal-rule-row">
                    <input type="text" placeholder={`Exit Rule ${i + 1}...`} value={rule}
                      onChange={e => handleRuleChange('exitRules', i, e.target.value)} />
                    {modalForm.exitRules.length > 1 && (
                      <button className="rule-remove-btn" onClick={() => handleRemoveRule('exitRules', i)}><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button className="rule-add-btn" onClick={() => handleAddRule('exitRules')}><Plus size={14} /> Add Rule</button>
              </div>

              <div className="modal-field">
                <label>Timeframes</label>
                <div className="tf-chips">
                  {allTimeframes.map(tf => (
                    <button key={tf} className={`tf-chip ${modalForm.timeframes.includes(tf) ? 'active' : ''}`}
                      onClick={() => toggleTimeframe(tf)}>{tf}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="modal-save-btn" onClick={handleSaveSetup} disabled={!modalForm.name.trim()}>Save Setup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
