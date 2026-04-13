import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, Eye, TrendingUp, TrendingDown, DollarSign,
  Scale, AlertTriangle, Calendar, Clock, FileText, Tag,
  ChevronDown, X, CheckCircle2, Zap
} from 'lucide-react';
import type { Trade } from '../types/trade';
import { SETUPS, EMOTIONS, MISTAKES, TIMEFRAMES, ASSET_TYPES } from '../types/trade';
import { storage } from '../utils/storage';
import { calcPnL, calcRiskReward, calcRMultiple, formatCurrency } from '../utils/calculations';

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
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!validate()) return;

    const trade: Trade = {
      ...form,
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      result: livePnL >= 0 ? 'Profit' : 'Loss',
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    const trades = storage.getTrades();
    trades.push(trade);
    storage.saveTrades(trades);

    setShowSuccess(true);
    setTimeout(() => {
      navigate('/');
    }, 1500);
  }

  function handleReset() {
    setForm({ ...defaultForm });
    setSubmitted(false);
    setErrors({});
  }

  // Success overlay
  if (showSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={48} color="var(--green-600)" />
          </div>
          <h2>Trade Saved!</h2>
          <p>
            {livePnL >= 0 ? '🎉 Profitable trade logged.' : '📉 Loss recorded — learn and improve!'}
          </p>
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
                <label>Instrument *</label>
                <input
                  type="text"
                  placeholder="e.g. NIFTY 50, RELIANCE"
                  value={form.instrument}
                  onChange={e => updateField('instrument', e.target.value)}
                />
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
              <DollarSign size={18} color="var(--green-600)" />
              <h3>Price & Position</h3>
            </div>

            {/* Direction Toggle */}
            <div className="direction-toggle">
              <button
                type="button"
                className={`direction-btn long ${form.direction === 'Long' ? 'active' : ''}`}
                onClick={() => updateField('direction', 'Long')}
              >
                <TrendingUp size={16} /> Long
              </button>
              <button
                type="button"
                className={`direction-btn short ${form.direction === 'Short' ? 'active' : ''}`}
                onClick={() => updateField('direction', 'Short')}
              >
                <TrendingDown size={16} /> Short
              </button>
            </div>

            <div className="form-grid-2">
              <div className={`form-group ${errors.entryPrice ? 'has-error' : ''}`}>
                <label>Entry Price *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={form.entryPrice || ''}
                  onChange={e => updateField('entryPrice', parseFloat(e.target.value) || 0)}
                />
                {errors.entryPrice && <span className="form-error">{errors.entryPrice}</span>}
              </div>
              <div className={`form-group ${errors.exitPrice ? 'has-error' : ''}`}>
                <label>Exit Price *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={form.exitPrice || ''}
                  onChange={e => updateField('exitPrice', parseFloat(e.target.value) || 0)}
                />
                {errors.exitPrice && <span className="form-error">{errors.exitPrice}</span>}
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={form.stopLoss || ''}
                  onChange={e => updateField('stopLoss', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Target Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={form.targetPrice || ''}
                  onChange={e => updateField('targetPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className={`form-group ${errors.quantity ? 'has-error' : ''}`}>
                <label>Quantity *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={form.quantity || ''}
                  onChange={e => updateField('quantity', parseFloat(e.target.value) || 0)}
                />
                {errors.quantity && <span className="form-error">{errors.quantity}</span>}
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Fees / Commission</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={form.fees || ''}
                  onChange={e => updateField('fees', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label><Tag size={13} /> Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. earnings, breakout, scalp"
                  value={form.tags}
                  onChange={e => updateField('tags', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Psychology */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <AlertTriangle size={18} color="var(--orange-500)" />
              <h3>Psychology & Review</h3>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Emotion</label>
                <div className="select-wrapper">
                  <select value={form.emotion} onChange={e => updateField('emotion', e.target.value)}>
                    {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>
              <div className="form-group">
                <label>Mistake</label>
                <div className="select-wrapper">
                  <select value={form.mistake} onChange={e => updateField('mistake', e.target.value)}>
                    <option value="">None</option>
                    {MISTAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Trade Notes</label>
              <textarea
                placeholder="What was your thesis? What did you observe? What would you do differently?"
                rows={4}
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleReset}>
              <X size={16} /> Reset Form
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitted && !isFormValid}
            >
              <Save size={16} /> Save Trade
            </button>
          </div>
        </div>

        {/* ===== RIGHT: LIVE PREVIEW ===== */}
        <div className="add-trade-preview">
          <div className="card preview-card sticky-preview animate-in">
            <div className="form-section-header">
              <Eye size={18} color="var(--green-600)" />
              <h3>Live Preview</h3>
            </div>

            {/* P&L Display */}
            <div className={`preview-pnl ${livePnL >= 0 ? 'positive' : 'negative'}`}>
              <span className="preview-pnl-label">Estimated P&L</span>
              <span className="preview-pnl-value">
                {form.entryPrice && form.exitPrice && form.quantity
                  ? formatCurrency(livePnL)
                  : '—'}
              </span>
            </div>

            {/* Key Metrics */}
            <div className="preview-metrics">
              <div className="preview-metric">
                <Scale size={14} />
                <span>Risk : Reward</span>
                <strong>{liveRR > 0 ? `1 : ${liveRR.toFixed(2)}` : '—'}</strong>
              </div>
              <div className="preview-metric">
                <Zap size={14} />
                <span>R-Multiple</span>
                <strong className={liveRMultiple >= 0 ? 'positive' : 'negative'}>
                  {liveRMultiple !== 0 ? `${liveRMultiple >= 0 ? '+' : ''}${liveRMultiple.toFixed(2)}R` : '—'}
                </strong>
              </div>
              <div className="preview-metric">
                <TrendingDown size={14} />
                <span>Risk (₹)</span>
                <strong className="negative">{liveRisk > 0 ? formatCurrency(-liveRisk).replace('+', '') : '—'}</strong>
              </div>
              <div className="preview-metric">
                <TrendingUp size={14} />
                <span>Reward (₹)</span>
                <strong className="positive">{liveReward > 0 ? formatCurrency(liveReward) : '—'}</strong>
              </div>
            </div>

            {/* Trade Summary */}
            <div className="preview-summary">
              <h4>Trade Summary</h4>
              <div className="preview-row">
                <span>Instrument</span>
                <strong>{form.instrument || '—'}</strong>
              </div>
              <div className="preview-row">
                <span>Direction</span>
                <strong>
                  <span className={`badge ${form.direction === 'Long' ? 'badge-long' : 'badge-short'}`}>
                    {form.direction === 'Long' ? '↑' : '↓'} {form.direction}
                  </span>
                </strong>
              </div>
              <div className="preview-row">
                <span>Setup</span>
                <strong>{form.setup || '—'}</strong>
              </div>
              <div className="preview-row">
                <span>Date</span>
                <strong>{form.date ? new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>
              </div>
              <div className="preview-row">
                <span>Entry → Exit</span>
                <strong>
                  {form.entryPrice ? `₹${form.entryPrice.toLocaleString()}` : '—'}
                  {' → '}
                  {form.exitPrice ? `₹${form.exitPrice.toLocaleString()}` : '—'}
                </strong>
              </div>
              <div className="preview-row">
                <span>Quantity</span>
                <strong>{form.quantity || '—'}</strong>
              </div>
              {form.fees > 0 && (
                <div className="preview-row">
                  <span>Fees</span>
                  <strong>₹{form.fees.toLocaleString()}</strong>
                </div>
              )}
              {form.emotion !== 'Neutral' && (
                <div className="preview-row">
                  <span>Emotion</span>
                  <strong>{form.emotion}</strong>
                </div>
              )}
              {form.mistake && (
                <div className="preview-row">
                  <span>Mistake</span>
                  <strong className="negative">{form.mistake}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
