import { useEffect } from 'react';
import { X, Edit3, TrendingUp, TrendingDown } from 'lucide-react';
import type { Trade } from '../types/trade';
import { calcPnL, calcRiskReward, calcRMultiple, formatCurrency, pnlColorClass } from '../utils/calculations';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TradeDetailModal({ trade, onClose, onEdit }: TradeDetailModalProps) {
  useEffect(() => {
    if (!trade) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trade, onClose]);

  if (!trade) return null;

  const pnl = calcPnL(trade);
  const rr = calcRiskReward(trade);
  const rm = calcRMultiple(trade);

  const rows: Array<[string, string]> = [
    ['Date', fmtDate(trade.date)],
    ['Time', trade.time || '—'],
    ['Asset Type', trade.assetType],
    ['Setup', trade.setup || '—'],
    ['Timeframe', trade.timeframe || '—'],
    ['Entry Price', `₹${trade.entryPrice.toLocaleString('en-IN')}`],
    ['Exit Price', `₹${trade.exitPrice.toLocaleString('en-IN')}`],
    ['Stop Loss', trade.stopLoss ? `₹${trade.stopLoss.toLocaleString('en-IN')}` : '—'],
    ['Target', trade.targetPrice ? `₹${trade.targetPrice.toLocaleString('en-IN')}` : '—'],
    ['Quantity', String(trade.quantity)],
    ['Fees', `₹${trade.fees.toLocaleString('en-IN')}`],
    ['Emotion', trade.emotion || '—'],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card td-detail-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {trade.instrument}
            <span className={`direction-badge ${trade.direction.toLowerCase()}`}>
              {trade.direction === 'Long' ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {trade.direction}
            </span>
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="td-detail-metrics">
            <div className="td-metric">
              <span>P&L</span>
              <strong className={pnlColorClass(pnl)}>{formatCurrency(pnl)}</strong>
            </div>
            <div className="td-metric">
              <span>Risk : Reward</span>
              <strong>1 : {rr.toFixed(2)}</strong>
            </div>
            <div className="td-metric">
              <span>R-Multiple</span>
              <strong className={rm >= 0 ? 'positive' : 'negative'}>{rm >= 0 ? '+' : ''}{rm.toFixed(2)}R</strong>
            </div>
            <div className="td-metric">
              <span>Result</span>
              <strong className={pnl >= 0 ? 'positive' : 'negative'}>{pnl >= 0 ? 'Profit' : 'Loss'}</strong>
            </div>
          </div>

          <div className="td-detail-grid">
            {rows.map(([label, val]) => (
              <div key={label} className="td-detail-row">
                <span className="td-detail-label">{label}</span>
                <span className="td-detail-val">{val}</span>
              </div>
            ))}
          </div>

          {trade.mistake && (
            <div className="td-detail-block">
              <span className="td-detail-label">Mistake</span>
              <span className="badge orange" style={{ marginTop: 4 }}>{trade.mistake}</span>
            </div>
          )}

          {trade.tags && trade.tags.length > 0 && (
            <div className="td-detail-block">
              <span className="td-detail-label">Tags</span>
              <div className="td-detail-tags">
                {trade.tags.map(t => <span key={t} className="badge teal">{t}</span>)}
              </div>
            </div>
          )}

          {trade.notes && (
            <div className="td-detail-block">
              <span className="td-detail-label">Notes</span>
              <p className="td-detail-notes">{trade.notes}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>Close</button>
          <button className="modal-save-btn" onClick={() => onEdit(trade.id)}><Edit3 size={14} /> Edit Trade</button>
        </div>
      </div>
    </div>
  );
}
