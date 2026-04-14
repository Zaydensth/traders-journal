import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, Trash2,
  ChevronDown, ChevronUp, Calendar, Bell,
  Sun, Moon, Settings as SettingsIcon, LayoutDashboard,
  TrendingUp, TrendingDown, Filter,
  Target, BarChart3, Flame,
  Eye, Edit3, SlidersHorizontal,
  ArrowUpDown, List, LayoutGrid,
  RefreshCw, Hexagon, Flag
} from 'lucide-react';
import { FaSackDollar } from 'react-icons/fa6';
import type { Trade, TradeStats } from '../types/trade';
import { SETUPS, ASSET_TYPES } from '../types/trade';
import { storage } from '../utils/storage';
import {
  getTradeStats, calcPnL, calcRiskReward, calcRMultiple, formatCurrency
} from '../utils/calculations';
import { toggleTheme, getTheme } from '../utils/theme';
import { loadSampleData } from '../utils/sampleData';

/* ─── helpers ─── */
const AVATAR_COLORS = ['#4f46e5','#059669','#dc2626','#ea580c','#7c3aed','#0891b2','#be185d','#1e293b','#0d9488','#6d28d9'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function MiniChart({ positive }: { positive: boolean }) {
  const pts = positive
    ? '0,13 4,11 8,9 12,10 16,7 20,5 24,6 28,2'
    : '0,3 4,5 8,4 12,7 16,9 20,8 24,11 28,14';
  return (
    <svg width="56" height="20" viewBox="0 0 28 16" style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={positive ? '#10b981' : '#ef4444'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type SortField = 'date' | 'instrument' | 'setup' | 'direction' | 'entryPrice' | 'exitPrice' | 'pnl';

export default function AllTrades() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);

  /* filters */
  const [search, setSearch] = useState('');
  const [filterDirection, setFilterDirection] = useState('All');
  const [filterResult, setFilterResult] = useState('All');
  const [filterSetup, setFilterSetup] = useState('All');
  const [filterAsset, setFilterAsset] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [showMore, setShowMore] = useState(false);

  /* sort & pagination */
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortPreset, setSortPreset] = useState('latest');
  const [page, setPage] = useState(1);
  const pageSize = 7;

  /* UI */
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [bellRead, setBellRead] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSampleData();
    const data = storage.getTrades();
    setTrades(data);
    setStats(getTradeStats(data));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ─── date range computation ─── */
  function getDateBounds() {
    const now = new Date();
    if (dateRange === 'today') {
      const t = now.toISOString().split('T')[0];
      return { from: t, to: t };
    }
    if (dateRange === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split('T')[0], to: '' };
    }
    if (dateRange === 'month') {
      return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: '' };
    }
    if (dateRange === '3months') {
      const d = new Date(now); d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().split('T')[0], to: '' };
    }
    if (dateRange === '6months') {
      const d = new Date(now); d.setMonth(d.getMonth() - 6);
      return { from: d.toISOString().split('T')[0], to: '' };
    }
    if (dateRange === 'year') {
      return { from: `${now.getFullYear()}-01-01`, to: '' };
    }
    return { from: '', to: '' };
  }

  /* ─── filtering ─── */
  const filtered = useMemo(() => {
    const bounds = getDateBounds();
    return trades.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.instrument.toLowerCase().includes(q) && !t.setup.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q)) return false;
      }
      if (filterDirection !== 'All' && t.direction !== filterDirection) return false;
      if (filterResult !== 'All' && t.result !== filterResult) return false;
      if (filterSetup !== 'All' && t.setup !== filterSetup) return false;
      if (filterAsset !== 'All' && t.assetType !== filterAsset) return false;
      if (bounds.from && t.date < bounds.from) return false;
      if (bounds.to && t.date > bounds.to) return false;
      return true;
    });
  }, [trades, search, filterDirection, filterResult, filterSetup, filterAsset, dateRange]);

  /* ─── sorting ─── */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'date':        va = a.date + a.time; vb = b.date + b.time; break;
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const filteredStats = useMemo(() => {
    const wins = filtered.filter(t => calcPnL(t) >= 0).length;
    const pnl  = filtered.reduce((s, t) => s + calcPnL(t), 0);
    return { wins, total: filtered.length, winRate: filtered.length ? (wins / filtered.length) * 100 : 0, pnl };
  }, [filtered]);

  /* ─── handlers ─── */
  function handleSortPreset(val: string) {
    setSortPreset(val);
    if (val === 'latest')    { setSortField('date'); setSortDir('desc'); }
    else if (val === 'oldest')  { setSortField('date'); setSortDir('asc'); }
    else if (val === 'pnl_high') { setSortField('pnl'); setSortDir('desc'); }
    else if (val === 'pnl_low')  { setSortField('pnl'); setSortDir('asc'); }
    setPage(1);
  }

  function handleColumnSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setSortPreset('custom');
    setPage(1);
  }

  function clearFilters() {
    setSearch(''); setFilterDirection('All'); setFilterResult('All');
    setFilterSetup('All'); setFilterAsset('All'); setDateRange('all');
    setShowMore(false); setPage(1);
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this trade? This cannot be undone.')) return;
    const updated = trades.filter(t => t.id !== id);
    storage.saveTrades(updated);
    setTrades(updated);
    setStats(getTradeStats(updated));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
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
    a.href = url; a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleAll() {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(t => t.id)));
  }

  const hasActiveFilters = search || filterDirection !== 'All' || filterResult !== 'All'
    || filterSetup !== 'All' || filterAsset !== 'All' || dateRange !== 'all';

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={11} style={{ opacity: 0.3, marginLeft: 3 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ marginLeft: 3 }} />
      : <ChevronDown size={11} style={{ marginLeft: 3 }} />;
  }

  function pageButtons() {
    const btns: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1, 2, 3);
      if (page > 4) btns.push(-1);
      if (page > 3 && page < totalPages - 2) btns.push(page);
      if (page < totalPages - 3) btns.push(-2);
      btns.push(totalPages - 1, totalPages);
    }
    return [...new Set(btns)].sort((a, b) => a - b);
  }

  const showFrom = (page - 1) * pageSize + 1;
  const showTo = Math.min(page * pageSize, sorted.length);

  if (!stats) return null;

  return (
    <>
      {/* ===== PAGE HEADER ===== */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>All Trades</h2>
          <p>Review and analyze every trade you've taken.</p>
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
          <button className="btn-outline-green" onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.82rem' }}>
            <Download size={14} /> Export
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
                  <SettingsIcon size={14} /> Settings
                </button>
                <div className="dropdown-divider" />
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* ===== FILTERS ===== */}
        <div className="card at-filter-card animate-in">
          <div className="at-filter-header">
            <div className="at-filter-title">
              <Filter size={16} /> Filters
              <button className="at-clear-btn" onClick={clearFilters} style={{ opacity: hasActiveFilters ? 1 : 0.4, marginLeft: 10, fontWeight: 600 }}>Clear All</button>
            </div>
          </div>
          <div className="at-filter-fields">
            <div className="input-with-icon" style={{ flex: '2 1 200px' }}>
              <Search size={14} className="input-icon" />
              <input type="text" placeholder="Search by symbol or note..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 32 }} />
            </div>

            <div className="at-filter-group">
              <label className="at-filter-label">Date Range</label>
              <div className="select-wrapper has-prefix-icon">
                <Calendar size={14} className="select-prefix-icon" />
                <select value={dateRange} onChange={e => { setDateRange(e.target.value); setPage(1); }}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="year">This Year</option>
                </select>
                <ChevronDown size={13} className="select-icon" />
              </div>
            </div>

            <div className="at-filter-group">
              <label className="at-filter-label">Setup</label>
              <div className="select-wrapper has-prefix-icon">
                <Hexagon size={14} className="select-prefix-icon" />
                <select value={filterSetup} onChange={e => { setFilterSetup(e.target.value); setPage(1); }}>
                  <option value="All">All Setups</option>
                  {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="select-icon" />
              </div>
            </div>

            <div className="at-filter-group">
              <label className="at-filter-label">Direction</label>
              <div className="select-wrapper has-prefix-icon">
                <ArrowUpDown size={14} className="select-prefix-icon" />
                <select value={filterDirection} onChange={e => { setFilterDirection(e.target.value); setPage(1); }}>
                  <option value="All">All Directions</option>
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                </select>
                <ChevronDown size={13} className="select-icon" />
              </div>
            </div>

            <div className="at-filter-group">
              <label className="at-filter-label">Result</label>
              <div className="select-wrapper has-prefix-icon">
                <Flag size={14} className="select-prefix-icon" />
                <select value={filterResult} onChange={e => { setFilterResult(e.target.value); setPage(1); }}>
                  <option value="All">All Results</option>
                  <option value="Profit">Profit</option>
                  <option value="Loss">Loss</option>
                </select>
                <ChevronDown size={13} className="select-icon" />
              </div>
            </div>

            <button className="header-btn at-more-btn" onClick={() => setShowMore(v => !v)}>
              <SlidersHorizontal size={13} /> More Filters
            </button>
          </div>

          {showMore && (
            <div className="at-filter-fields" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
              <div className="at-filter-group">
                <label className="at-filter-label">Asset Type</label>
                <div className="select-wrapper">
                  <select value={filterAsset} onChange={e => { setFilterAsset(e.target.value); setPage(1); }}>
                    <option value="All">All Assets</option>
                    {ASSET_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <ChevronDown size={13} className="select-icon" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== STAT CARDS ===== */}
        <div className="stat-cards" style={{ marginBottom: 24 }}>
          <div className="stat-card animate-in">
            <div className="stat-card-icon blue"><BarChart3 size={22} /></div>
            <div className="stat-card-label">Total Trades</div>
            <div className="stat-card-value">{filteredStats.total}</div>
            <div className="stat-card-change up">of {trades.length} total</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon green"><RefreshCw size={22} /></div>
            <div className="stat-card-label">Win Rate</div>
            <div className="stat-card-value">{filteredStats.winRate.toFixed(1)}%</div>
            <div className={`stat-card-change ${stats.winRateChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.winRateChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.winRateChangeVsLastWeek).toFixed(1)}% vs last month
            </div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon green"><FaSackDollar size={22} /></div>
            <div className="stat-card-label">Total Net P&L</div>
            <div className={`stat-card-value ${filteredStats.pnl >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(filteredStats.pnl)}
            </div>
            <div className={`stat-card-change ${stats.pnlChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.pnlChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.pnlChangeVsLastWeek).toFixed(1)}% vs last month
            </div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon green"><Target size={22} /></div>
            <div className="stat-card-label">Avg Risk : Reward</div>
            <div className="stat-card-value">1 : {stats.avgRiskReward.toFixed(2)}</div>
            <div className={`stat-card-change ${stats.rrChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.rrChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.rrChangeVsLastWeek).toFixed(2)} vs last month
            </div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon blue"><Calendar size={22} /></div>
            <div className="stat-card-label">Best Day</div>
            <div className="stat-card-value" style={{ fontSize: '0.95rem' }}>
              {new Date(stats.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="stat-card-change up">{formatCurrency(stats.bestDay.pnl)}</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-card-icon red"><Flame size={22} /></div>
            <div className="stat-card-label">Losing Streak</div>
            <div className="stat-card-value">{stats.losingStreak.count} Trades</div>
            <div className="stat-card-change">{stats.losingStreak.period}</div>
          </div>
        </div>

        {/* ===== TABLE CARD ===== */}
        <div className="card animate-in">
          <div className="at-table-header">
            <div className="card-title">
              Trades <span className="at-table-count">({filteredStats.total})</span>
            </div>
            <div className="at-table-controls">
              <div className="select-wrapper" style={{ minWidth: 140 }}>
                <select value={sortPreset} onChange={e => handleSortPreset(e.target.value)}>
                  <option value="latest">Sort by: Latest First</option>
                  <option value="oldest">Sort by: Oldest First</option>
                  <option value="pnl_high">Sort by: P&L High→Low</option>
                  <option value="pnl_low">Sort by: P&L Low→High</option>
                  <option value="custom" disabled>Custom Sort</option>
                </select>
                <ChevronDown size={13} className="select-icon" />
              </div>
              <div className="at-view-toggles">
                <button className={`at-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
                <button className={`at-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><LayoutGrid size={16} /></button>
              </div>
            </div>
          </div>

          <div className="card-body-np">
            {paginated.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Filter size={36} style={{ marginBottom: 14, opacity: 0.35 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: 12 }}>No trades match your filters.</p>
                {hasActiveFilters && (
                  <button className="btn-outline-green" onClick={clearFilters} style={{ fontSize: '0.82rem' }}>Clear Filters</button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <table className="data-table at-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" className="at-checkbox"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll} />
                    </th>
                    <th className="th-sortable" onClick={() => handleColumnSort('date')}>Date & Time <SortIcon field="date" /></th>
                    <th className="th-sortable" onClick={() => handleColumnSort('instrument')}>Instrument <SortIcon field="instrument" /></th>
                    <th className="th-sortable" onClick={() => handleColumnSort('setup')}>Setup <SortIcon field="setup" /></th>
                    <th className="th-sortable" onClick={() => handleColumnSort('direction')}>Direction <SortIcon field="direction" /></th>
                    <th>Entry &rarr; Exit</th>
                    <th>R:R</th>
                    <th className="th-sortable" onClick={() => handleColumnSort('pnl')}>Result <SortIcon field="pnl" /></th>
                    <th>Mistake</th>
                    <th>Chart</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(trade => {
                    const pnl = calcPnL(trade);
                    const rr  = calcRiskReward(trade);
                    const rm  = calcRMultiple(trade);
                    const color = avatarColor(trade.instrument);
                    return (
                      <tr key={trade.id} className={selected.has(trade.id) ? 'row-selected' : ''}>
                        <td>
                          <input type="checkbox" className="at-checkbox"
                            checked={selected.has(trade.id)} onChange={() => toggleSelect(trade.id)} />
                        </td>
                        <td className="td-date">
                          <div>{new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="td-time">{trade.time || '—'}</div>
                        </td>
                        <td>
                          <div className="instrument-cell">
                            <div className="instrument-avatar" style={{ background: color }}>
                              {trade.instrument.charAt(0)}
                            </div>
                            <div>
                              <div className="instrument-name">{trade.instrument}</div>
                              <div className="instrument-type">{trade.assetType}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge teal">{trade.setup}</span></td>
                        <td>
                          <span className={`direction-badge ${trade.direction.toLowerCase()}`}>
                            {trade.direction === 'Long' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {trade.direction}
                          </span>
                        </td>
                        <td className="td-entry-exit">
                          <span>{trade.entryPrice.toLocaleString()}</span>
                          <span className="entry-arrow">&rarr;</span>
                          <span>{trade.exitPrice.toLocaleString()}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>1 : {rr.toFixed(1)}</td>
                        <td>
                          <div className="result-cell">
                            <span className={pnl >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 700 }}>
                              {formatCurrency(pnl)}
                            </span>
                            <span className={`result-rmultiple ${rm >= 0 ? 'positive' : 'negative'}`}>
                              {rm >= 0 ? '+' : ''}{rm.toFixed(2)}R
                            </span>
                          </div>
                        </td>
                        <td>
                          {trade.mistake
                            ? <span className="badge orange">{trade.mistake}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          <div className="chart-thumb">
                            <MiniChart positive={pnl >= 0} />
                          </div>
                        </td>
                        <td>
                          <div className="at-action-btns">
                            <button className="at-action-btn" title="View"><Eye size={14} /></button>
                            <button className="at-action-btn" title="Edit"><Edit3 size={14} /></button>
                            <button className="at-action-btn danger" title="Delete" onClick={() => handleDelete(trade.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ─── Grid View ─── */
              <div className="at-grid-view">
                {paginated.map(trade => {
                  const pnl = calcPnL(trade);
                  const rr = calcRiskReward(trade);
                  const color = avatarColor(trade.instrument);
                  return (
                    <div key={trade.id} className="at-grid-card card">
                      <div className="at-grid-card-header">
                        <div className="instrument-cell">
                          <div className="instrument-avatar" style={{ background: color }}>{trade.instrument.charAt(0)}</div>
                          <div>
                            <div className="instrument-name">{trade.instrument}</div>
                            <div className="instrument-type">{trade.assetType}</div>
                          </div>
                        </div>
                        <span className={`direction-badge ${trade.direction.toLowerCase()}`}>
                          {trade.direction === 'Long' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {trade.direction}
                        </span>
                      </div>
                      <div className="at-grid-card-body">
                        <div className="at-grid-row">
                          <span className="at-grid-label">Date</span>
                          <span className="at-grid-val">{new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="at-grid-row">
                          <span className="at-grid-label">Setup</span>
                          <span className="badge teal">{trade.setup}</span>
                        </div>
                        <div className="at-grid-row">
                          <span className="at-grid-label">Entry &rarr; Exit</span>
                          <span className="at-grid-val">{trade.entryPrice.toLocaleString()} &rarr; {trade.exitPrice.toLocaleString()}</span>
                        </div>
                        <div className="at-grid-row">
                          <span className="at-grid-label">R:R</span>
                          <span className="at-grid-val">1 : {rr.toFixed(1)}</span>
                        </div>
                        <div className="at-grid-row">
                          <span className="at-grid-label">P&L</span>
                          <span className={`at-grid-val ${pnl >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 700 }}>{formatCurrency(pnl)}</span>
                        </div>
                        {trade.mistake && (
                          <div className="at-grid-row">
                            <span className="at-grid-label">Mistake</span>
                            <span className="badge orange">{trade.mistake}</span>
                          </div>
                        )}
                      </div>
                      <div className="at-grid-card-footer">
                        <MiniChart positive={pnl >= 0} />
                        <div className="at-action-btns">
                          <button className="at-action-btn" title="View"><Eye size={14} /></button>
                          <button className="at-action-btn" title="Edit"><Edit3 size={14} /></button>
                          <button className="at-action-btn danger" title="Delete" onClick={() => handleDelete(trade.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Pagination ─── */}
          {sorted.length > 0 && (
            <div className="at-pagination">
              <span className="at-page-info">Showing {showFrom} to {showTo} of {sorted.length} trades</span>
              <div className="at-page-btns">
                <button className="at-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&lt;</button>
                {pageButtons().map((p, i) =>
                  p < 0 ? <span key={`gap${i}`} className="at-page-gap">...</span> : (
                    <button key={p} className={`at-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  )
                )}
                <button className="at-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>&gt;</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
