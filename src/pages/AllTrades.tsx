import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, Download, Trash2,
  ChevronUp, ChevronDown, Calendar, Bell,
  Sun, Moon, Settings, LayoutDashboard,
  ArrowUpDown, TrendingUp, TrendingDown, X,
  PlusCircle
} from 'lucide-react';
import type { Trade } from '../types/trade';
import { SETUPS, ASSET_TYPES } from '../types/trade';
import { storage } from '../utils/storage';
import { calcPnL, calcRiskReward, formatCurrency } from '../utils/calculations';
import { toggleTheme, getTheme } from '../utils/theme';

type SortField = 'date' | 'instrument' | 'setup' | 'direction' | 'entryPrice' | 'exitPrice' | 'pnl';

export default function AllTrades() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [search, setSearch] = useState('');
  const [filterDirection, setFilterDirection] = useState('All');
  const [filterResult, setFilterResult] = useState('All');
  const [filterSetup, setFilterSetup] = useState('All');
  const [filterAsset, setFilterAsset] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [bellRead, setBellRead] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTrades(storage.getTrades());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.instrument.toLowerCase().includes(q) && !t.setup.toLowerCase().includes(q)) return false;
      }
      if (filterDirection !== 'All' && t.direction !== filterDirection) return false;
      if (filterResult !== 'All' && t.result !== filterResult) return false;
      if (filterSetup !== 'All' && t.setup !== filterSetup) return false;
      if (filterAsset !== 'All' && t.assetType !== filterAsset) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [trades, search, filterDirection, filterResult, filterSetup, filterAsset, dateFrom, dateTo]);

  /* ─── Sorting ─── */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'date':        va = a.date;          vb = b.date;          break;
        case 'instrument':  va = a.instrument;    vb = b.instrument;    break;
        case 'setup':       va = a.setup;         vb = b.setup;         break;
        case 'direction':   va = a.direction;     vb = b.direction;     break;
        case 'entryPrice':  va = a.entryPrice;    vb = b.entryPrice;    break;
        case 'exitPrice':   va = a.exitPrice;     vb = b.exitPrice;     break;
        case 'pnl':         va = calcPnL(a);      vb = calcPnL(b);      break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  /* ─── Pagination ─── */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  /* ─── Summary stats of filtered set ─── */
  const filteredStats = useMemo(() => {
    const wins = filtered.filter(t => calcPnL(t) >= 0).length;
    const pnl  = filtered.reduce((s, t) => s + calcPnL(t), 0);
    return { wins, total: filtered.length, winRate: filtered.length ? (wins / filtered.length) * 100 : 0, pnl };
  }, [filtered]);

  /* ─── Handlers ─── */
  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  }

  function clearFilters() {
    setSearch(''); setFilterDirection('All'); setFilterResult('All');
    setFilterSetup('All'); setFilterAsset('All'); setDateFrom(''); setDateTo('');
    setPage(1);
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this trade? This cannot be undone.')) return;
    const updated = trades.filter(t => t.id !== id);
    storage.saveTrades(updated);
    setTrades(updated);
  }

  function handleExport() {
    const header = ['Date','Time','Instrument','Asset Type','Setup','Timeframe','Direction',
                    'Entry','Exit','SL','Target','Qty','Fees','Result','P&L','R:R','Emotion','Mistake','Notes'];
    const rows = filtered.map(t => [
      t.date, t.time, t.instrument, t.assetType, t.setup, t.timeframe, t.direction,
      t.entryPrice, t.exitPrice, t.stopLoss, t.targetPrice, t.quantity, t.fees,
      t.result, calcPnL(t).toFixed(2), calcRiskReward(t).toFixed(2),
      t.emotion, t.mistake, `"${t.notes.replace(/"/g,'""')}"`
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasActiveFilters = search || filterDirection !== 'All' || filterResult !== 'All'
    || filterSetup !== 'All' || filterAsset !== 'All' || dateFrom || dateTo;

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.35 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  /* ─── Pagination buttons helper ─── */
  function pageButtons() {
    const start = Math.max(1, Math.min(totalPages - 4, page - 2));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }

  return (
    <>
      {/* ===== PAGE HEADER ===== */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>All Trades</h2>
          <p>Review, filter, and manage your complete trade history.</p>
        </div>
        <div className="page-header-right">
          <button className="header-btn">
            <Calendar size={15} />
            {(() => {
              const today = new Date();
              const ms = new Date(today.getFullYear(), today.getMonth(), 1);
              const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return `${fmt(ms)} – ${fmt(today)}, ${today.getFullYear()}`;
            })()}
            <ChevronDown size={13} />
          </button>

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
                  <span className="notif-badge">{Math.min(trades.length, 5)}</span>
                </div>
                {trades.slice(0, 5).map(trade => {
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
                {trades.length === 0 && <div className="notif-empty">No trades yet</div>}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="dropdown-wrap" ref={profileRef}>
            <div className="user-profile-badge" onClick={() => { setShowProfile(v => !v); setShowBell(false); }}>
              <div className="user-avatar">RT</div>
              <div className="user-profile-info">
                <span className="user-profile-name">Rahul Trader</span>
                <span className="user-profile-plan">Pro Plan</span>
              </div>
              <ChevronDown size={14} color="var(--text-secondary)" />
            </div>
            {showProfile && (
              <div className="dropdown-panel profile-dropdown">
                <div className="dropdown-user-header">
                  <div className="user-avatar" style={{ width: 38, height: 38, flexShrink: 0 }}>RT</div>
                  <div>
                    <div className="dropdown-user-name">Rahul Trader</div>
                    <div className="dropdown-user-plan">Pro Plan · Active</div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/'); }}>
                  <LayoutDashboard size={14} /> Dashboard
                </button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}>
                  <Settings size={14} /> Settings
                </button>
                <div className="dropdown-divider" />
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* ===== MINI STATS ROW ===== */}
        <div className="at-stats-row">
          <div className="at-stat-item">
            <span className="at-stat-label">Showing</span>
            <span className="at-stat-value">{filteredStats.total} trades</span>
          </div>
          <div className="at-stat-sep" />
          <div className="at-stat-item">
            <span className="at-stat-label">Win Rate</span>
            <span className="at-stat-value">{filteredStats.winRate.toFixed(1)}%</span>
          </div>
          <div className="at-stat-sep" />
          <div className="at-stat-item">
            <span className="at-stat-label">Net P&L</span>
            <span className={`at-stat-value ${filteredStats.pnl >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(filteredStats.pnl)}
            </span>
          </div>
          <div className="at-stat-sep" />
          <div className="at-stat-item">
            <span className="at-stat-label">Wins</span>
            <span className="at-stat-value" style={{ color: 'var(--green-600)' }}>{filteredStats.wins}</span>
          </div>
          <div className="at-stat-sep" />
          <div className="at-stat-item">
            <span className="at-stat-label">Losses</span>
            <span className="at-stat-value" style={{ color: 'var(--red-500)' }}>{filteredStats.total - filteredStats.wins}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Link to="/add-trade" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.84rem', textDecoration: 'none', borderRadius: 'var(--radius-sm)' }}>
              <PlusCircle size={15} /> Add Trade
            </Link>
          </div>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <div className="at-filters-row">
            {/* Search */}
            <div className="input-with-icon" style={{ flex: '2 1 180px' }}>
              <Search size={14} className="input-icon" />
              <input
                type="text"
                placeholder="Search instrument or setup..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 32 }}
              />
            </div>

            <div className="select-wrapper" style={{ flex: '1 1 120px' }}>
              <select value={filterDirection} onChange={e => { setFilterDirection(e.target.value); setPage(1); }}>
                <option value="All">All Directions</option>
                <option value="Long">Long ↑</option>
                <option value="Short">Short ↓</option>
              </select>
              <ChevronDown size={13} className="select-icon" />
            </div>

            <div className="select-wrapper" style={{ flex: '1 1 120px' }}>
              <select value={filterResult} onChange={e => { setFilterResult(e.target.value); setPage(1); }}>
                <option value="All">All Results</option>
                <option value="Profit">Profit</option>
                <option value="Loss">Loss</option>
              </select>
              <ChevronDown size={13} className="select-icon" />
            </div>

            <div className="select-wrapper" style={{ flex: '1 1 130px' }}>
              <select value={filterSetup} onChange={e => { setFilterSetup(e.target.value); setPage(1); }}>
                <option value="All">All Setups</option>
                {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="select-icon" />
            </div>

            <div className="select-wrapper" style={{ flex: '1 1 120px' }}>
              <select value={filterAsset} onChange={e => { setFilterAsset(e.target.value); setPage(1); }}>
                <option value="All">All Assets</option>
                {ASSET_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <ChevronDown size={13} className="select-icon" />
            </div>

            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ flex: '1 1 130px' }} />
            <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setPage(1); }} style={{ flex: '1 1 130px' }} />

            {hasActiveFilters && (
              <button className="header-btn" onClick={clearFilters} style={{ color: 'var(--red-500)', whiteSpace: 'nowrap' }}>
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">
              <FileText size={18} color="var(--green-600)" />
              Trade History
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                ({filteredStats.total} records)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="select-wrapper" style={{ minWidth: 100 }}>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <ChevronDown size={13} className="select-icon" />
              </div>
              <button className="btn-outline-green" onClick={handleExport} style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div className="card-body-np">
            {paginated.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Filter size={36} style={{ marginBottom: 14, opacity: 0.35 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No trades match your filters.</p>
                {hasActiveFilters && (
                  <button className="btn-outline-green" onClick={clearFilters} style={{ marginTop: 12, fontSize: '0.82rem' }}>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="th-sortable" onClick={() => handleSort('date')}>Date <SortIcon field="date" /></th>
                    <th className="th-sortable" onClick={() => handleSort('instrument')}>Instrument <SortIcon field="instrument" /></th>
                    <th>Asset</th>
                    <th className="th-sortable" onClick={() => handleSort('setup')}>Setup <SortIcon field="setup" /></th>
                    <th>TF</th>
                    <th className="th-sortable" onClick={() => handleSort('direction')}>Dir <SortIcon field="direction" /></th>
                    <th className="th-sortable" onClick={() => handleSort('entryPrice')}>Entry <SortIcon field="entryPrice" /></th>
                    <th className="th-sortable" onClick={() => handleSort('exitPrice')}>Exit <SortIcon field="exitPrice" /></th>
                    <th>R:R</th>
                    <th className="th-sortable" onClick={() => handleSort('pnl')}>P&L <SortIcon field="pnl" /></th>
                    <th>Mistake</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(trade => {
                    const pnl = calcPnL(trade);
                    const rr  = calcRiskReward(trade);
                    return (
                      <tr key={trade.id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.79rem', whiteSpace: 'nowrap' }}>
                          {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{trade.instrument}</td>
                        <td><span className="badge teal">{trade.assetType}</span></td>
                        <td><span className="badge teal">{trade.setup}</span></td>
                        <td style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>{trade.timeframe}</td>
                        <td>
                          <span className={`direction-badge ${trade.direction.toLowerCase()}`}>
                            {trade.direction === 'Long' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {trade.direction}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>₹{trade.entryPrice.toLocaleString()}</td>
                        <td style={{ fontSize: '0.82rem' }}>₹{trade.exitPrice.toLocaleString()}</td>
                        <td style={{ fontSize: '0.82rem' }}>1:{rr.toFixed(1)}</td>
                        <td>
                          <span className={pnl >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 700 }}>
                            {formatCurrency(pnl)}
                          </span>
                        </td>
                        <td>
                          {trade.mistake
                            ? <span className="badge orange">{trade.mistake}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          <button className="icon-btn-danger" onClick={() => handleDelete(trade.id)} title="Delete trade">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ─── Pagination ─── */}
          {totalPages > 1 && (
            <div className="at-pagination">
              <span className="at-page-info">Page {page} of {totalPages} · {filteredStats.total} trades</span>
              <div className="at-page-btns">
                <button className="at-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                <button className="at-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {pageButtons().map(p => (
                  <button key={p} className={`at-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="at-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                <button className="at-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
