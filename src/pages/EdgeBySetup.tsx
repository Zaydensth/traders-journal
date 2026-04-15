import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Bell, ChevronDown, Plus, X, Trash2, Edit3,
  TrendingUp, TrendingDown, Target, MoreHorizontal,
  BarChart2, CheckCircle2, AlertTriangle, Settings
} from 'lucide-react';
import { storage } from '../utils/storage';
import { calcPnL, calcRiskReward, formatCurrency } from '../utils/calculations';
import type { Trade, CustomSetup } from '../types/trade';
// types
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

const SETUP_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
];

interface SetupCardData {
  name: string;
  subtitle: string;
  winRate: number;
  winRateChange: number;
  trades: number;
  avgRR: number;
  pnl: number;
  tags: string[];
  color: string;
  isCustom: boolean;
  customId?: string;
  tradesList: Trade[];
}

export default function EdgeBySetup() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSetup, setEditingSetup] = useState<CustomSetup | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, setIsDark] = useState(getTheme() === 'dark');
  const [selectedSetup, setSelectedSetup] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState('This Month');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
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

  // Filter trades by time period
  const filteredTrades = useMemo(() => {
    const now = new Date();
    return trades.filter(t => {
      const d = new Date(t.date);
      if (timePeriod === 'This Week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      if (timePeriod === 'This Month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (timePeriod === 'Last 3 Months') {
        const threeMonths = new Date(now);
        threeMonths.setMonth(threeMonths.getMonth() - 3);
        return d >= threeMonths;
      }
      return true; // All Time
    });
  }, [trades, timePeriod]);

  // Build setup cards from BOTH custom setups AND trades
  const setupCards = useMemo((): SetupCardData[] => {
    const cards: SetupCardData[] = [];
    const usedSetupNames = new Set<string>();

    // First: cards from custom setups (client's saved strategies)
    customSetups.forEach((cs, i) => {
      const setupTrades = filteredTrades.filter(t => t.setup === cs.name);
      const wins = setupTrades.filter(t => calcPnL(t) > 0).length;
      const pnls = setupTrades.map(t => calcPnL(t));
      const rrs = setupTrades.map(t => calcRiskReward(t)).filter(r => r > 0);
      const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
      const winRate = setupTrades.length > 0 ? (wins / setupTrades.length) * 100 : 0;

      // Determine subtitle from timeframes and description
      const subtitle = cs.timeframes.length > 0
        ? cs.timeframes.join(' · ')
        : cs.description || 'Custom Setup';

      // Tags from entry/exit rules (first keyword of each)
      const tags: string[] = [];
      if (cs.entryRules.length > 0) tags.push(...cs.entryRules.slice(0, 2).map(r => r.split(' ').slice(0, 3).join(' ')));

      cards.push({
        name: cs.name,
        subtitle,
        winRate,
        winRateChange: 0,
        trades: setupTrades.length,
        avgRR,
        pnl: pnls.reduce((a, b) => a + b, 0),
        tags: tags.length > 0 ? tags : [cs.name],
        color: cs.color || SETUP_COLORS[i % SETUP_COLORS.length],
        isCustom: true,
        customId: cs.id,
        tradesList: setupTrades,
      });
      usedSetupNames.add(cs.name);
    });

    // Second: cards from trades with setups NOT already covered by custom setups
    const tradeMap = new Map<string, Trade[]>();
    filteredTrades.forEach(t => {
      if (t.setup && !usedSetupNames.has(t.setup)) {
        if (!tradeMap.has(t.setup)) tradeMap.set(t.setup, []);
        tradeMap.get(t.setup)!.push(t);
      }
    });

    Array.from(tradeMap.entries()).forEach(([setup, tds], i) => {
      const wins = tds.filter(t => calcPnL(t) > 0).length;
      const pnls = tds.map(t => calcPnL(t));
      const rrs = tds.map(t => calcRiskReward(t)).filter(r => r > 0);
      const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

      // Determine asset type and timeframe from trades
      const assetTypes = [...new Set(tds.map(t => t.assetType))];
      const timeframes = [...new Set(tds.map(t => t.timeframe).filter(Boolean))];
      const subtitle = [...assetTypes, ...timeframes].join(' · ') || 'Trading Setup';

      cards.push({
        name: setup,
        subtitle,
        winRate: (wins / tds.length) * 100,
        winRateChange: 0,
        trades: tds.length,
        avgRR,
        pnl: pnls.reduce((a, b) => a + b, 0),
        tags: [setup],
        color: SETUP_COLORS[(customSetups.length + i) % SETUP_COLORS.length],
        isCustom: false,
        tradesList: tds,
      });
    });

    return cards.sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades, customSetups]);

  const selectedCard = selectedSetup ? setupCards.find(c => c.name === selectedSetup) : null;

  // Modal form state
  const [modalForm, setModalForm] = useState({
    name: '', description: '', entryRules: [''], exitRules: [''], slRules: [''],
    timeframes: [] as string[], color: SETUP_COLORS[0],
  });

  function openEditModal(cs: CustomSetup) {
    setEditingSetup(cs);
    setModalForm({
      name: cs.name,
      description: cs.description,
      entryRules: cs.entryRules.length > 0 ? cs.entryRules : [''],
      exitRules: cs.exitRules.length > 0 ? cs.exitRules : [''],
      slRules: cs.slRules.length > 0 ? cs.slRules : [''],
      timeframes: cs.timeframes,
      color: cs.color,
    });
    setShowModal(true);
  }

  function openNewModal() {
    setEditingSetup(null);
    setModalForm({
      name: '', description: '', entryRules: [''], exitRules: [''], slRules: [''],
      timeframes: [], color: SETUP_COLORS[customSetups.length % SETUP_COLORS.length],
    });
    setShowModal(true);
  }

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

    if (editingSetup) {
      // Update existing
      const updated = customSetups.map(cs =>
        cs.id === editingSetup.id ? {
          ...cs,
          name: modalForm.name.trim(),
          description: modalForm.description.trim(),
          entryRules: modalForm.entryRules.filter(r => r.trim()),
          exitRules: modalForm.exitRules.filter(r => r.trim()),
          slRules: modalForm.slRules.filter(r => r.trim()),
          timeframes: modalForm.timeframes,
          color: modalForm.color,
        } : cs
      );
      setCustomSetups(updated);
      storage.saveCustomSetups(updated);
    } else {
      // New
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
    }
    setShowModal(false);
    setEditingSetup(null);
  }

  function handleDeleteSetup(id: string) {
    if (!window.confirm('Delete this setup?')) return;
    const updated = customSetups.filter(s => s.id !== id);
    setCustomSetups(updated);
    storage.saveCustomSetups(updated);
    if (selectedSetup) setSelectedSetup(null);
  }

  const allTimeframes = ['1 Minute', '5 Minute', '15 Minute', '30 Minute', '1 Hour', '4 Hour', 'Daily'];

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Edge by Setup</h2>
          <p>Define your trading setups to track performance and improve your edge.</p>
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
                <button className="dropdown-item" onClick={() => { logout(); }} style={{ color: 'var(--red-500)' }}><X size={14} /> Sign Out</button>
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* TAB BAR + ADD SETUP */}
        <div className="ebs-tab-bar">
          <div className="ebs-tabs">
            <button className="ebs-tab active">Setups</button>
          </div>
          <button className="ebs-add-btn" onClick={openNewModal}>
            <Plus size={16} /> Add New Setup
          </button>
        </div>

        {/* SETUP CARDS GRID — 2 columns matching reference */}
        {setupCards.length === 0 ? (
          <div className="card animate-in" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--text-primary)' }}>No Setups Yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Create your first setup to start tracking your edge.</p>
            <button className="ebs-add-btn" onClick={openNewModal}><Plus size={16} /> Add New Setup</button>
          </div>
        ) : (
          <div className="ebs-cards-grid">
            {setupCards.map(card => {
              const custom = customSetups.find(cs => cs.name === card.name);
              return (
                <div key={card.name} className={`ebs-card animate-in ${selectedSetup === card.name ? 'active' : ''}`}>
                  {/* Card header */}
                  <div className="ebs-card-top">
                    <div>
                      <div className="ebs-card-name">{card.name}</div>
                      <div className="ebs-card-subtitle">{card.subtitle}</div>
                    </div>
                    <div className="ebs-card-actions" style={{ position: 'relative' }}>
                      <button className="ebs-icon-btn" onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === card.name ? null : card.name);
                      }} title="More">
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpen === card.name && (
                        <div className="ebs-popup-menu">
                          <button className="ebs-popup-item" onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            if (custom) {
                              openEditModal(custom);
                            } else {
                              const newCs: CustomSetup = {
                                id: storage.generateId(),
                                name: card.name,
                                description: card.subtitle,
                                entryRules: [],
                                exitRules: [],
                                slRules: [],
                                timeframes: [],
                                color: card.color,
                                createdAt: new Date().toISOString(),
                              };
                              openEditModal(newCs);
                              const updated = [...customSetups, newCs];
                              setCustomSetups(updated);
                              storage.saveCustomSetups(updated);
                            }
                          }}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button className="ebs-popup-item danger" onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            if (card.isCustom && card.customId) {
                              handleDeleteSetup(card.customId);
                            }
                          }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="ebs-card-stats">
                    <div className="ebs-stat">
                      <span className="ebs-stat-label">Win Rate</span>
                      <span className={`ebs-stat-value ${card.winRate >= 50 ? 'positive' : 'negative'}`}>
                        {card.trades > 0 ? `${card.winRate.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                    <div className="ebs-stat">
                      <span className="ebs-stat-label">Trades</span>
                      <span className="ebs-stat-value">{card.trades}</span>
                    </div>
                    <div className="ebs-stat">
                      <span className="ebs-stat-label">Avg R:R</span>
                      <span className="ebs-stat-value">{card.trades > 0 ? `1:${card.avgRR.toFixed(2)}` : '—'}</span>
                    </div>
                    <div className="ebs-stat">
                      <span className="ebs-stat-label">Net P&L</span>
                      <span className={`ebs-stat-value ${card.pnl >= 0 ? 'positive' : 'negative'}`}>
                        {card.trades > 0 ? formatCurrency(card.pnl) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="ebs-card-tags">
                    {card.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="ebs-tag" style={{ borderColor: card.color, color: card.color }}>{tag}</span>
                    ))}
                  </div>

                  {/* Bottom actions */}
                  <div className="ebs-card-bottom">
                    <button className="ebs-view-btn" onClick={() => setSelectedSetup(selectedSetup === card.name ? null : card.name)}>
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Setup Rules now only visible inside View Details section below */}

        {/* SELECTED SETUP DETAIL */}
        {selectedCard && (
          <div className="card animate-in" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={18} color="var(--green-500)" /> {selectedCard.name} — Details
              </div>
            </div>

            {/* Quick stats */}
            <div className="setup-detail-grid">
              <div className="setup-detail-item">
                <TrendingUp size={16} color="var(--green-500)" />
                <span>Best Trade</span>
                <strong className="positive">
                  {selectedCard.tradesList.length > 0 ? formatCurrency(Math.max(...selectedCard.tradesList.map(t => calcPnL(t)))) : '—'}
                </strong>
              </div>
              <div className="setup-detail-item">
                <TrendingDown size={16} color="var(--red-500)" />
                <span>Worst Trade</span>
                <strong className="negative">
                  {selectedCard.tradesList.length > 0 ? formatCurrency(Math.min(...selectedCard.tradesList.map(t => calcPnL(t)))) : '—'}
                </strong>
              </div>
              <div className="setup-detail-item">
                <BarChart2 size={16} color="var(--text-secondary)" />
                <span>Avg P&L</span>
                <strong className={selectedCard.pnl >= 0 ? 'positive' : 'negative'}>
                  {selectedCard.trades > 0 ? formatCurrency(selectedCard.pnl / selectedCard.trades) : '—'}
                </strong>
              </div>
              <div className="setup-detail-item">
                <Target size={16} color="var(--text-secondary)" />
                <span>Win Rate</span>
                <strong>{selectedCard.trades > 0 ? `${selectedCard.winRate.toFixed(1)}%` : '—'}</strong>
              </div>
            </div>

            {/* Setup rules if custom */}
            {(() => {
              const cs = customSetups.find(c => c.name === selectedCard.name);
              if (!cs) return null;
              return (
                <div style={{ marginTop: 16, padding: '16px 0', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Setup Rules</h4>
                  <div className="custom-setup-rules">
                    {cs.entryRules.length > 0 && (
                      <div><span className="rule-label">ENTRY:</span> {cs.entryRules.map((r, i) => <span key={i} className="rule-tag green">{r}</span>)}</div>
                    )}
                    {cs.slRules.length > 0 && (
                      <div><span className="rule-label">SL:</span> {cs.slRules.map((r, i) => <span key={i} className="rule-tag red">{r}</span>)}</div>
                    )}
                    {cs.exitRules.length > 0 && (
                      <div><span className="rule-label">TARGET:</span> {cs.exitRules.map((r, i) => <span key={i} className="rule-tag blue">{r}</span>)}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Recent trades */}
            {selectedCard.tradesList.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Recent Trades</h4>
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Instrument</th><th>Direction</th><th>Entry → Exit</th><th>P&L</th></tr>
                  </thead>
                  <tbody>
                    {selectedCard.tradesList.slice(0, 5).map(t => (
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
            )}
          </div>
        )}
      </div>

      {/* ADD/EDIT SETUP MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingSetup(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSetup ? 'Edit Setup' : 'Add New Setup'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingSetup(null); }}><X size={18} /></button>
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
              <button className="modal-cancel-btn" onClick={() => { setShowModal(false); setEditingSetup(null); }}>Cancel</button>
              <button className="modal-save-btn" onClick={handleSaveSetup} disabled={!modalForm.name.trim()}>
                {editingSetup ? 'Update Setup' : 'Save Setup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
