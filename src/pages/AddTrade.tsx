import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown,
  Calendar, Clock, Tag, Search,
  ChevronDown, X, CheckCircle2, Upload, Image,
  Bell, Sun, Zap
} from 'lucide-react';
import type { Trade } from '../types/trade';
import { SETUPS, TIMEFRAMES, ASSET_TYPES } from '../types/trade';
import { storage } from '../utils/storage';
import { calcPnL, calcRiskReward, calcRMultiple, formatCurrency } from '../utils/calculations';

const EMOTION_OPTIONS = [
  { label: 'Neutral', emoji: '😐' },
  { label: 'Fear', emoji: '😨' },
  { label: 'Greed', emoji: '🤑' },
  { label: 'Confidence', emoji: '😎' },
  { label: 'FOMO', emoji: '😰' },
];

const QUICK_TEMPLATES = [
  { name: 'EMA + VWAP Long', setup: 'EMA + VWAP', direction: 'Long' as const, timeframe: '15 Minute', assetType: 'Index' as Trade['assetType'] },
  { name: 'Breakout Short', setup: 'Breakout', direction: 'Short' as const, timeframe: '5 Minute', assetType: 'Stocks' as Trade['assetType'] },
];

type FormData = Omit<Trade, 'id' | 'result' | 'tags'> & { tags: string };

const defaultForm: FormData = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
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
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasMistake, setHasMistake] = useState(false);
  const [screenshotName, setScreenshotName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <button className="header-btn">
            <Calendar size={15} />
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            <ChevronDown size={13} />
          </button>
          <button className="header-btn"><Sun size={15} /></button>
          <button className="header-btn"><Bell size={15} /></button>
          <div className="user-profile-badge">
            <div className="user-avatar">RT</div>
            <div className="user-profile-info">
              <span className="user-profile-name">Rahul Trader</span>
              <span className="user-profile-plan">Pro Plan</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="add-trade-layout">

        {/* ===== LEFT: FORM ===== */}
        <div className="add-trade-form">

          {/* ── SECTION 1: Instrument & Setup ── */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <span className="section-number">1</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>Instrument & Setup</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--red-500)', fontWeight: 500 }}>* Required fields</span>
            </div>

            <div className="form-grid-3">
              {/* Symbol / Instrument */}
              <div className={`form-group ${errors.instrument ? 'has-error' : ''}`}>
                <label>Symbol / Instrument *</label>
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
                <label>Asset Type *</label>
                <div className="select-wrapper">
                  <select value={form.assetType} onChange={e => updateField('assetType', e.target.value as Trade['assetType'])}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>

              {/* Date & Time */}
              <div className="form-group">
                <label>Date & Time *</label>
                <div className="date-time-row">
                  <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)} />
                  <input type="time" value={form.time} onChange={e => updateField('time', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-grid-3">
              {/* Setup / Strategy */}
              <div className={`form-group ${errors.setup ? 'has-error' : ''}`}>
                <label>Setup / Strategy *</label>
                <div className="select-wrapper">
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
                <div className="select-wrapper">
                  <select value={form.timeframe} onChange={e => updateField('timeframe', e.target.value)}>
                    {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>

              {/* Direction */}
              <div className="form-group">
                <label>Direction *</label>
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
                <label>Entry Price *</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input type="number" step="any" placeholder="0.00" value={form.entryPrice || ''} onChange={e => updateField('entryPrice', parseFloat(e.target.value) || 0)} />
                </div>
                {errors.entryPrice && <span className="form-error">{errors.entryPrice}</span>}
              </div>

              <div className="form-group">
                <label>Stop Loss *</label>
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
                <label>Quantity / Lots *</label>
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
                <label>Exit Price *</label>
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
                <label>Result *</label>
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
                    className={`emotion-pill ${form.emotion === opt.label ? 'active' : ''}`}
                    onClick={() => updateField('emotion', opt.label)}
                  >
                    {opt.emoji} {opt.label}
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
              <span style={{ fontSize: '1rem' }}>👁</span>
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
              <Tag size={18} color="var(--text-secondary)" />
              <h3>Tags & Categories</h3>
            </div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>Tags</label>
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
