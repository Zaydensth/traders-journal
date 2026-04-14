import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown,
  Calendar, Clock, Search, Hash,
  ChevronDown, X, CheckCircle2, Upload, Image,
  Bell, Sun, Moon, Zap, Settings, LayoutDashboard,
  PenSquare, BarChart3, Layers, Timer, Eye
} from 'lucide-react';
import type { Trade } from '../types/trade';
import { SETUPS, TIMEFRAMES, ASSET_TYPES } from '../types/trade';
import { storage } from '../utils/storage';
import { calcPnL, calcRiskReward, calcRMultiple, formatCurrency } from '../utils/calculations';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

const EMOTION_OPTIONS = [
  { label: 'Neutral', emoji: '😐', color: '' },
  { label: 'Fear', emoji: '😨', color: '' },
  { label: 'Greed', emoji: '😈', color: 'purple' },
  { label: 'Confidence', emoji: '😎', color: '' },
  { label: 'FOMO', emoji: '😰', color: '' },
];

const QUICK_TEMPLATES = [
  { name: 'EMA + VWAP Long', setup: 'EMA + VWAP', direction: 'Long' as const, timeframe: '15 Minute', assetType: 'Index' as Trade['assetType'] },
  { name: 'Breakout Short', setup: 'Breakout', direction: 'Short' as const, timeframe: '5 Minute', assetType: 'Stocks' as Trade['assetType'] },
];

type FormData = Omit<Trade, 'id' | 'result' | 'tags'> & { tags: string };

const defaultForm: FormData = {
  date: new Date().toISOString().split('T')[0],
  time: '',
  exitTime: '',
  instrument: '',
  assetType: 'Stocks',
  setup: '',
  timeframe: '15 Minute',
  direction: 'Long',
  entryPrice: 0,
  exitPrice: 0,
  stopLoss: 0,
  targetPrice: 0,
  quantity: 0,
  fees: 0,
  notes: '',
  emotion: 'Neutral',
  mistake: '',
  tags: '',
  screenshot: '',
};

export default function AddTrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasMistake, setHasMistake] = useState(false);
  const [screenshotName, setScreenshotName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [bellRead, setBellRead] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const notifTrades = useMemo(() => storage.getTrades().slice(0, 5), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const previewTrade = useMemo((): Trade => ({
    ...form,
    id: 'preview',
    result: 'Profit',
    tags: tagsList,
  }), [form, tagsList]);

  const livePnL = useMemo(() => {
    if (!form.entryPrice || !form.exitPrice || !form.quantity) return 0;
    return calcPnL(previewTrade);
  }, [previewTrade, form.entryPrice, form.exitPrice, form.quantity]);

  const liveRR = useMemo(() => {
    if (!form.entryPrice || !form.stopLoss || !form.quantity) return 0;
    return calcRiskReward(previewTrade);
  }, [previewTrade, form.entryPrice, form.stopLoss, form.quantity]);

  const liveRMultiple = useMemo(() => {
    if (!form.entryPrice || !form.stopLoss || !form.quantity) return 0;
    return calcRMultiple(previewTrade);
  }, [previewTrade, form.entryPrice, form.stopLoss, form.quantity]);

  const liveRisk = useMemo(() => {
    if (!form.entryPrice || !form.stopLoss || !form.quantity) return 0;
    return Math.abs(form.entryPrice - form.stopLoss) * form.quantity;
  }, [form.entryPrice, form.stopLoss, form.quantity]);

  const liveReward = useMemo(() => {
    if (!form.entryPrice || !form.targetPrice || !form.quantity) return 0;
    return Math.abs(form.targetPrice - form.entryPrice) * form.quantity;
  }, [form.entryPrice, form.targetPrice, form.quantity]);

  const isFormValid = useMemo(() => {
    return form.instrument.trim() !== '' &&
           form.setup !== '' &&
           form.entryPrice > 0 &&
           form.exitPrice > 0 &&
           form.quantity > 0;
  }, [form]);

  const donutCircumference = 2 * Math.PI * 54;
  const donutPercent = liveRR > 0 ? Math.min(liveRR / 5, 1) : 0;
  const donutOffset = donutCircumference - donutPercent * donutCircumference;

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => { const next = { ...prev }; delete next[field as string]; return next; });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.instrument.trim()) errs.instrument = 'Instrument is required';
    if (!form.setup) errs.setup = 'Select a setup';
    if (form.entryPrice <= 0) errs.entryPrice = 'Enter a valid entry price';
    if (form.exitPrice <= 0) errs.exitPrice = 'Enter a valid exit price';
    if (form.quantity <= 0) errs.quantity = 'Enter quantity';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function addTag(val: string) {
    const trimmed = val.trim().replace(',', '');
    if (trimmed && !tagsList.includes(trimmed)) {
      setTagsList(prev => [...prev, trimmed]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTagsList(prev => prev.filter(t => t !== tag));
  }

  function applyTemplate(tpl: typeof QUICK_TEMPLATES[0]) {
    setForm(prev => ({ ...prev, setup: tpl.setup, direction: tpl.direction, timeframe: tpl.timeframe, assetType: tpl.assetType }));
  }

  function saveTrade(isDraft = false) {
    if (!isDraft) {
      setSubmitted(true);
      if (!validate()) return;
    }
    const trade: Trade = {
      ...form,
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      result: livePnL >= 0 ? 'Profit' : 'Loss',
      tags: tagsList,
    };
    const trades = storage.getTrades();
    trades.push(trade);
    storage.saveTrades(trades);
    if (!isDraft) {
      setShowSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } else {
      alert('Trade saved as draft!');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveTrade(false);
  }

  function handleReset() {
    setForm({ ...defaultForm });
    setSubmitted(false);
    setErrors({});
    setHasMistake(false);
    setScreenshotName('');
    setTagsList([]);
    setTagInput('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      updateField('screenshot', file.name);
    }
  }

  if (showSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <div className="success-icon"><CheckCircle2 size={48} color="var(--green-600)" /></div>
          <h2>Trade Saved!</h2>
          <p>{livePnL >= 0 ? '🎉 Profitable trade logged.' : '📉 Loss recorded — learn and improve!'}</p>
          <div className="success-stats">
            <div className={`success-stat ${livePnL >= 0 ? 'positive' : 'negative'}`}>
              <span>P&L</span><strong>{formatCurrency(livePnL)}</strong>
            </div>
            <div className="success-stat">
              <span>R:R</span><strong>1 : {liveRR.toFixed(2)}</strong>
            </div>
          </div>
          <p className="success-redirect">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Add New Trade</h2>
          <p>Record every trade and improve with detailed journaling.</p>
        </div>
        <div className="page-header-right">
          <button className="header-btn" onClick={() => { const next = toggleTheme(); setIsDark(next === 'dark'); }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Bell */}
          <div className="dropdown-wrap" ref={bellRef}>
            <div style={{ position: 'relative' }}>
              <button className="header-btn" onClick={() => { setShowBell(v => !v); setBellRead(true); setShowProfile(false); }}>
                <Bell size={15} />
              </button>
              {!bellRead && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, background: 'var(--red-500)', borderRadius: '50%', border: '1.5px solid var(--bg-card)', pointerEvents: 'none' }} />}
            </div>
            {showBell && (
              <div className="dropdown-panel notif-dropdown">
                <div className="notif-panel-header">
                  <span>Recent Trades</span>
                  <span className="notif-badge">{notifTrades.length}</span>
                </div>
                {notifTrades.map(trade => {
                  const pnl = calcPnL(trade);
                  return (
                    <div key={trade.id} className="notif-item">
                      <div className={`notif-dot-indicator ${pnl >= 0 ? 'green' : 'red'}`} />
                      <div className="notif-content">
                        <div className="notif-trade-title">{trade.instrument} · {trade.direction}</div>
                        <div className={`notif-trade-value ${pnl >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(pnl)}</div>
                      </div>
                      <div className="notif-trade-date">{new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  );
                })}
                {notifTrades.length === 0 && <div className="notif-empty">No trades yet</div>}
              </div>
            )}
          </div>

          {/* Profile */}
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
                <Link to="/" className="dropdown-item" onClick={() => setShowProfile(false)}>
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
                <Link to="/settings" className="dropdown-item" onClick={() => setShowProfile(false)}>
                  <Settings size={14} /> Settings
                </Link>
                <div className="dropdown-divider" />
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="add-trade-layout">

        {/* ===== LEFT: FORM ===== */}
        <div className="add-trade-form">

          {/* ── Trade Details Header ── */}
          <div className="card trade-details-header animate-in">
            <div className="td-header-row">
              <div className="td-header-icon-wrap">
                <PenSquare size={22} />
              </div>
              <div className="td-header-text">
                <h3>Trade Details</h3>
                <p>Enter the details of your trade</p>
              </div>
              <span className="td-required-legend"><span className="red-star">*</span> Required fields</span>
            </div>
          </div>

          {/* ── SECTION 1: Instrument & Setup ── */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <span className="section-number">1</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>Instrument & Setup</h3>
              </div>
            </div>

            <div className="form-grid-3">
              {/* Symbol / Instrument */}
              <div className={`form-group ${errors.instrument ? 'has-error' : ''}`}>
                <label>Symbol / Instrument <span className="red-star">*</span></label>
                <div className="input-with-icon">
                  <Search size={14} className="input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. NIFTY 50, RELIANCE"
                    value={form.instrument}
                    onChange={e => updateField('instrument', e.target.value)}
                    style={{ paddingLeft: 32 }}
                  />
                </div>
                {errors.instrument && <span className="form-error">{errors.instrument}</span>}
              </div>

              {/* Asset Type */}
              <div className="form-group">
                <label>Asset Type <span className="red-star">*</span></label>
                <div className="select-wrapper has-prefix-icon">
                  <BarChart3 size={14} className="select-prefix-icon" />
                  <select value={form.assetType} onChange={e => updateField('assetType', e.target.value as Trade['assetType'])}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>

              {/* Date & Time */}
              <div className="form-group">
                <label>Date & Time <span className="red-star">*</span></label>
                <div className="date-time-row">
                  <div className="input-with-icon" style={{ flex: 1 }}>
                    <Calendar size={14} className="input-icon" />
                    <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)} style={{ paddingLeft: 32 }} />
                  </div>
                  <div className="input-with-icon" style={{ flex: 1 }}>
                    <Clock size={14} className="input-icon" />
                    <input
                      type="text"
                      placeholder="09:45"
                      value={(() => {
                        if (!form.time) return '';
                        const [h, m] = form.time.split(':').map(Number);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
                      })()}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9:APMapm ]/g, '');
                        const match = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                        if (match) {
                          let h = parseInt(match[1]);
                          const mins = match[2];
                          const ampm = match[3].toUpperCase();
                          if (ampm === 'PM' && h !== 12) h += 12;
                          if (ampm === 'AM' && h === 12) h = 0;
                          updateField('time', `${String(h).padStart(2, '0')}:${mins}`);
                        }
                      }}
                      style={{ paddingLeft: 32 }}
                    />
                  </div>
                  <div className="ampm-toggle">
                    <button type="button" className={`ampm-btn ${!form.time || parseInt(form.time.split(':')[0]) < 12 ? 'active' : ''}`}
                      onClick={() => {
                        const [h, m] = (form.time || '09:00').split(':').map(Number);
                        const newH = h >= 12 ? h - 12 : h;
                        updateField('time', `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      }}>AM</button>
                    <button type="button" className={`ampm-btn ${form.time && parseInt(form.time.split(':')[0]) >= 12 ? 'active' : ''}`}
                      onClick={() => {
                        const [h, m] = (form.time || '09:00').split(':').map(Number);
                        const newH = h < 12 ? h + 12 : h;
                        updateField('time', `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      }}>PM</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-grid-3">
              {/* Setup / Strategy */}
              <div className={`form-group ${errors.setup ? 'has-error' : ''}`}>
                <label>Setup / Strategy <span className="red-star">*</span></label>
                <div className="select-wrapper has-prefix-icon">
                  <Layers size={14} className="select-prefix-icon" />
                  <select value={form.setup} onChange={e => updateField('setup', e.target.value)}>
                    <option value="">Select setup...</option>
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
                {errors.setup && <span className="form-error">{errors.setup}</span>}
              </div>

              {/* Timeframe */}
              <div className="form-group">
                <label>Timeframe</label>
                <div className="select-wrapper has-prefix-icon">
                  <Timer size={14} className="select-prefix-icon" />
                  <select value={form.timeframe} onChange={e => updateField('timeframe', e.target.value)}>
                    {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>

              {/* Direction */}
              <div className="form-group">
                <label>Direction <span className="red-star">*</span></label>
                <div className="direction-toggle" style={{ marginBottom: 0 }}>
                  <button type="button" className={`direction-btn long ${form.direction === 'Long' ? 'active' : ''}`} onClick={() => updateField('direction', 'Long')}>
                    <TrendingUp size={15} /> Long
                  </button>
                  <button type="button" className={`direction-btn short ${form.direction === 'Short' ? 'active' : ''}`} onClick={() => updateField('direction', 'Short')}>
                    <TrendingDown size={15} /> Short
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Prices & Position ── */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <span className="section-number">2</span>
              <h3>Prices & Position</h3>
            </div>

            <div className="form-grid-3">
              <div className={`form-group ${errors.entryPrice ? 'has-error' : ''}`}>
                <label>Entry Price <span className="red-star">*</span></label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0.00" value={form.entryPrice || ''} onChange={e => updateField('entryPrice', parseFloat(e.target.value) || 0)} />
                </div>
                {errors.entryPrice && <span className="form-error">{errors.entryPrice}</span>}
              </div>

              <div className="form-group">
                <label>Stop Loss <span className="red-star">*</span></label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0.00" value={form.stopLoss || ''} onChange={e => updateField('stopLoss', parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="form-group">
                <label>Target Price</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0.00" value={form.targetPrice || ''} onChange={e => updateField('targetPrice', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="form-grid-3">
              <div className={`form-group ${errors.quantity ? 'has-error' : ''}`}>
                <label>Quantity / Lots <span className="red-star">*</span></label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0" value={form.quantity || ''} onChange={e => updateField('quantity', parseFloat(e.target.value) || 0)} />
                </div>
                {errors.quantity && <span className="form-error">{errors.quantity}</span>}
              </div>

              {/* Risk per Trade — computed */}
              <div className="form-group">
                <label>Risk per Trade (₹)</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input
                    type="text"
                    value={liveRisk > 0 ? liveRisk.toLocaleString('en-IN') : ''}
                    placeholder="Auto calculated"
                    readOnly
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'default' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fees & Charges (₹)</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0.00" value={form.fees || ''} onChange={e => updateField('fees', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: Outcome ── */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <span className="section-number">3</span>
              <h3>Outcome</h3>
            </div>

            <div className="form-grid-3">
              <div className={`form-group ${errors.exitPrice ? 'has-error' : ''}`}>
                <label>Exit Price <span className="red-star">*</span></label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0.00" value={form.exitPrice || ''} onChange={e => updateField('exitPrice', parseFloat(e.target.value) || 0)} />
                </div>
                {errors.exitPrice && <span className="form-error">{errors.exitPrice}</span>}
              </div>

              <div className="form-group">
                <label><Clock size={13} /> Exit Time</label>
                <input type="time" value={form.exitTime || ''} onChange={e => updateField('exitTime', e.target.value)} />
              </div>

              {/* Result — auto computed */}
              <div className="form-group">
                <label>Result <span className="red-star">*</span></label>
                <div className="direction-toggle" style={{ marginBottom: 0 }}>
                  <button type="button" className={`direction-btn long ${form.exitPrice > 0 && livePnL >= 0 ? 'active' : ''}`} disabled={form.exitPrice <= 0}>
                    <TrendingUp size={15} /> Profit
                  </button>
                  <button type="button" className={`direction-btn short ${form.exitPrice > 0 && livePnL < 0 ? 'active' : ''}`} disabled={form.exitPrice <= 0}>
                    <TrendingDown size={15} /> Loss
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 4: Notes & Psychology ── */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <span className="section-number">4</span>
              <h3>Notes & Psychology</h3>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Trade Notes</label>
              <textarea
                placeholder="Clean EMA crossover above VWAP with good volume.&#10;Price respected 15m trend. Exited at target as planned."
                rows={3}
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Emotions Felt</label>
               <div className="emotion-pills">
                {EMOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`emotion-pill ${form.emotion === opt.label ? 'active' : ''} ${opt.color ? `emotion-${opt.color}` : ''}`}
                    onClick={() => updateField('emotion', opt.label)}
                  >
                    <span className="emotion-emoji">{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mistake-checkbox-inline">
              <label className="mistake-label">Mistake Made?</label>
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={hasMistake}
                  onChange={e => {
                    setHasMistake(e.target.checked);
                    if (!e.target.checked) updateField('mistake', '');
                  }}
                />
                <span className="custom-checkbox"></span>
                <span>Yes, I made a mistake in this trade</span>
              </label>
            </div>

            {hasMistake && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <div className="select-wrapper">
                  <select value={form.mistake} onChange={e => updateField('mistake', e.target.value)}>
                    <option value="">Select mistake...</option>
                    <option>Early Entry</option>
                    <option>No Stop Loss</option>
                    <option>Overtrading</option>
                    <option>Revenge Trade</option>
                    <option>Moved SL</option>
                    <option>Late Exit</option>
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleReset}>Cancel</button>
            <button type="button" className="btn-primary-outlined" onClick={() => saveTrade(true)}>Save as Draft</button>
            <button type="submit" className="btn-primary" disabled={submitted && !isFormValid}>
              <CheckCircle2 size={16} /> Save Trade
            </button>
          </div>
        </div>

        {/* ===== RIGHT: PREVIEW ===== */}
        <div className="add-trade-preview">

          {/* Trade Summary Preview */}
          <div className="card preview-card sticky-preview animate-in">
            <div className="form-section-header">
              <Eye size={18} color="var(--green-500)" />
              <h3>Trade Summary Preview</h3>
            </div>

            <div className="preview-donut-row">
              <div className="preview-donut-wrap">
                <svg viewBox="0 0 120 120" className="preview-donut-svg">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-light)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={livePnL >= 0 ? 'var(--green-500)' : 'var(--red-400)'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={donutOffset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="preview-donut-center">
                  <div className={`donut-pnl ${livePnL >= 0 ? 'positive' : 'negative'}`}>
                    {form.entryPrice && form.exitPrice && form.quantity ? formatCurrency(livePnL) : '—'}
                  </div>
                  <div className="donut-label">{livePnL >= 0 ? 'Profit' : 'Loss'}</div>
                </div>
              </div>

              <div className="preview-donut-metrics">
                <div className="preview-donut-metric">
                  <span className="pdm-dot">○</span>
                  <span>Risk</span>
                  <strong>₹{liveRisk > 0 ? liveRisk.toLocaleString('en-IN') : '0'}</strong>
                </div>
                <div className="preview-donut-metric">
                  <span className="pdm-dot">○</span>
                  <span>Reward</span>
                  <strong>₹{liveReward > 0 ? liveReward.toLocaleString('en-IN') : '0'}</strong>
                </div>
                <div className="preview-donut-metric">
                  <span className="pdm-dot">○</span>
                  <span>Risk : Reward</span>
                  <strong>{liveRR > 0 ? `1 : ${liveRR.toFixed(2)}` : '—'}</strong>
                </div>
                <div className="preview-donut-metric">
                  <span className="pdm-dot">○</span>
                  <span>R Multiple</span>
                  <strong className={liveRMultiple >= 0 ? 'positive' : 'negative'}>
                    {liveRMultiple !== 0 ? `${liveRMultiple >= 0 ? '+' : ''}${liveRMultiple.toFixed(2)}R` : '—'}
                  </strong>
                </div>
              </div>
            </div>

            {form.entryPrice > 0 && form.exitPrice > 0 && form.quantity > 0 && (
              <div className={`preview-message ${livePnL >= 0 ? 'win' : 'lose'}`}>
                <span>{livePnL >= 0 ? '🎯' : '📉'}</span>
                <div>
                  <strong>{livePnL >= 0 ? 'This is a winning trade!' : 'This trade is at a loss.'}</strong>
                  <span>{livePnL >= 0 ? 'Your R:R is positive. Well executed.' : 'Review your entry/exit levels.'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Screenshot */}
          <div className="card form-section animate-in" style={{ marginTop: 16 }}>
            <div className="form-section-header" style={{ marginBottom: 12 }}>
              <Image size={18} color="var(--text-secondary)" />
              <h3>Upload Screenshot</h3>
            </div>
            <div className="screenshot-dropzone" onClick={() => fileInputRef.current?.click()}>
              <Upload size={28} color="var(--text-muted)" />
              <p>Drag & drop chart screenshot here</p>
              <span>or</span>
              <button type="button" className="btn-outline-green" style={{ marginTop: 8 }}>
                <Image size={14} /> Choose File
              </button>
              <p className="screenshot-hint">PNG, JPG up to 5MB</p>
              {screenshotName && <p className="screenshot-filename">📎 {screenshotName}</p>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {/* Tags & Categories */}
          <div className="card form-section animate-in" style={{ marginTop: 16 }}>
            <div className="form-section-header" style={{ marginBottom: 12 }}>
              <div className="td-header-icon-wrap" style={{ width: 36, height: 36 }}>
                <Hash size={18} />
              </div>
              <h3>Tags & Categories</h3>
            </div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Tags</label>
            {tagsList.length > 0 && (
              <div className="tags-pills-row">
                {tagsList.map(tag => (
                  <span key={tag} className="tag-pill">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); }
                if (e.key === ',') { e.preventDefault(); addTag(tagInput); }
              }}
            />
          </div>

          {/* Quick Templates */}
          <div className="card form-section animate-in" style={{ marginTop: 16 }}>
            <div className="form-section-header" style={{ marginBottom: 12 }}>
              <Zap size={18} color="var(--text-secondary)" />
              <h3>Quick Templates</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Apply a saved template:</p>
            <div className="quick-templates-row">
              {QUICK_TEMPLATES.map(tpl => (
                <button key={tpl.name} type="button" className="quick-template-btn" onClick={() => applyTemplate(tpl)}>
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

        </div>
      </form>
    </>
  );
}
