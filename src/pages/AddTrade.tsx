import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown,
  Calendar, Clock, FileText, Tag,
  ChevronDown, X, CheckCircle2, Upload, Image
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

type FormData = Omit<Trade, 'id' | 'result' | 'tags'> & { tags: string };

const defaultForm: FormData = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview calculations
  const previewTrade = useMemo((): Trade => ({
    ...form,
    id: 'preview',
    result: 'Profit',
    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  }), [form]);

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

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
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

  function saveTrade(isDraft = false) {
    if (!isDraft) {
      setSubmitted(true);
      if (!validate()) return;
    }

    const trade: Trade = {
      ...form,
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      result: livePnL >= 0 ? 'Profit' : 'Loss',
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      // In a real app, upload to server. For now, store name.
      updateField('screenshot', file.name);
    }
  }

  // Donut chart for preview
  const donutCircumference = 2 * Math.PI * 54;
  const donutPercent = liveRR > 0 ? Math.min(liveRR / 5, 1) : 0;
  const donutOffset = donutCircumference - donutPercent * donutCircumference;

  // Success overlay
  if (showSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={48} color="var(--green-600)" />
          </div>
          <h2>Trade Saved!</h2>
          <p>{livePnL >= 0 ? '🎉 Profitable trade logged.' : '📉 Loss recorded — learn and improve!'}</p>
          <div className="success-stats">
            <div className={`success-stat ${livePnL >= 0 ? 'positive' : 'negative'}`}>
              <span>P&L</span>
              <strong>{formatCurrency(livePnL)}</strong>
            </div>
            <div className="success-stat">
              <span>R:R</span>
              <strong>1 : {liveRR.toFixed(2)}</strong>
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
          <p>Log your trade with precision. Calculations update in real-time.</p>
        </div>
        <div className="page-header-right">
          <button type="button" className="header-btn" onClick={handleReset}>
            <X size={14} /> Reset
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="add-trade-layout">
        {/* ===== LEFT: FORM ===== */}
        <div className="add-trade-form">

          {/* Section 1: Trade Info */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <FileText size={18} color="var(--green-600)" />
              <h3>Trade Information</h3>
            </div>
            <div className="form-grid-3">
              <div className={`form-group ${errors.instrument ? 'has-error' : ''}`}>
                <label>Instrument & Setup *</label>
                <input type="text" placeholder="e.g. NIFTY 50, RELIANCE" value={form.instrument} onChange={e => updateField('instrument', e.target.value)} />
                {errors.instrument && <span className="form-error">{errors.instrument}</span>}
              </div>
              <div className="form-group">
                <label>Asset Type</label>
                <div className="select-wrapper">
                  <select value={form.assetType} onChange={e => updateField('assetType', e.target.value as Trade['assetType'])}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>
              <div className={`form-group ${errors.setup ? 'has-error' : ''}`}>
                <label>Setup *</label>
                <div className="select-wrapper">
                  <select value={form.setup} onChange={e => updateField('setup', e.target.value)}>
                    <option value="">Select setup...</option>
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
                {errors.setup && <span className="form-error">{errors.setup}</span>}
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label><Calendar size={13} /> Date</label>
                <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label><Clock size={13} /> Time</label>
                <input type="time" value={form.time} onChange={e => updateField('time', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Timeframe</label>
                <div className="select-wrapper">
                  <select value={form.timeframe} onChange={e => updateField('timeframe', e.target.value)}>
                    {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Direction & Prices */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <span style={{ color: 'var(--green-600)' }}>₹</span>
              <h3>Price & Position</h3>
            </div>
            <div className="direction-toggle">
              <button type="button" className={`direction-btn long ${form.direction === 'Long' ? 'active' : ''}`} onClick={() => updateField('direction', 'Long')}>
                <TrendingUp size={16} /> Long
              </button>
              <button type="button" className={`direction-btn short ${form.direction === 'Short' ? 'active' : ''}`} onClick={() => updateField('direction', 'Short')}>
                <TrendingDown size={16} /> Short
              </button>
            </div>
            <div className="form-grid-2">
              <div className={`form-group ${errors.entryPrice ? 'has-error' : ''}`}>
                <label>Entry Price *</label>
                <input type="number" step="any" placeholder="0.00" value={form.entryPrice || ''} onChange={e => updateField('entryPrice', parseFloat(e.target.value) || 0)} />
                {errors.entryPrice && <span className="form-error">{errors.entryPrice}</span>}
              </div>
              <div className={`form-group ${errors.exitPrice ? 'has-error' : ''}`}>
                <label>Exit Price *</label>
                <input type="number" step="any" placeholder="0.00" value={form.exitPrice || ''} onChange={e => updateField('exitPrice', parseFloat(e.target.value) || 0)} />
                {errors.exitPrice && <span className="form-error">{errors.exitPrice}</span>}
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Stop Loss</label>
                <input type="number" step="any" placeholder="0.00" value={form.stopLoss || ''} onChange={e => updateField('stopLoss', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Target Price</label>
                <input type="number" step="any" placeholder="0.00" value={form.targetPrice || ''} onChange={e => updateField('targetPrice', parseFloat(e.target.value) || 0)} />
              </div>
              <div className={`form-group ${errors.quantity ? 'has-error' : ''}`}>
                <label>Quantity *</label>
                <input type="number" step="any" placeholder="0" value={form.quantity || ''} onChange={e => updateField('quantity', parseFloat(e.target.value) || 0)} />
                {errors.quantity && <span className="form-error">{errors.quantity}</span>}
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Fees / Commission</label>
                <input type="number" step="any" placeholder="0.00" value={form.fees || ''} onChange={e => updateField('fees', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Section 3: Notes & Psychology */}
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

            {/* Emotion Pills */}
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

            {/* Mistake Checkbox - inline */}
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

        {/* ===== RIGHT: LIVE PREVIEW ===== */}
        <div className="add-trade-preview">
          {/* Trade Summary Preview with Donut */}
          <div className="card preview-card sticky-preview animate-in">
            <div className="form-section-header">
              <span style={{ fontSize: '1rem' }}>📊</span>
              <h3>Trade Summary Preview</h3>
            </div>

            <div className="preview-donut-row">
              {/* Donut */}
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

              {/* Metrics */}
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

            {/* Win/Loss message */}
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
            <div className="form-section-header">
              <Image size={18} color="var(--text-secondary)" />
              <h3>Upload Screenshot</h3>
            </div>
            <div
              className="screenshot-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} color="var(--text-muted)" />
              <p>Drag & drop chart screenshot here</p>
              <span>or</span>
              <button type="button" className="btn-outline-green" style={{ marginTop: 8 }}>
                <Image size={14} /> Choose File
              </button>
              <p className="screenshot-hint">PNG, JPG up to 5MB</p>
              {screenshotName && <p className="screenshot-filename">📎 {screenshotName}</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Tags — below Upload Screenshot */}
          <div className="card form-section animate-in" style={{ marginTop: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label><Tag size={13} /> Tags (comma-separated)</label>
              <input type="text" placeholder="e.g. earnings, breakout, scalp" value={form.tags} onChange={e => updateField('tags', e.target.value)} />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
