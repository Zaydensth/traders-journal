import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSackDollar } from 'react-icons/fa6';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Target, Scale, BarChart3, TrendingDown, Activity,
  Bell, ChevronDown, Clock, Sun, Moon, Calendar,
  Flame, CheckCircle2, LineChart, PieChart,
  ArrowRight, LayoutGrid, Rocket, RefreshCw,
  Settings, LayoutDashboard
} from 'lucide-react';
import type { Trade, TradeStats, SetupEdge, MistakeEntry } from '../types/trade';
import { storage } from '../utils/storage';
import { toggleTheme, getTheme } from '../utils/theme';
import {
  getTradeStats,
  getSetupEdges,
  getMistakeHeatmap,
  getEquityCurve,
  calcPnL,
  calcRiskReward,
  formatCurrency,
  pnlColorClass
} from '../utils/calculations';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

type TimePeriod = 'Today' | 'This Week' | 'This Month' | 'Last 3 Months' | 'Last 6 Months' | 'This Year' | 'All Time';

const PERIOD_OPTIONS: TimePeriod[] = ['Today', 'This Week', 'This Month', 'Last 3 Months', 'Last 6 Months', 'This Year', 'All Time'];

function filterByPeriod(allTrades: Trade[], period: TimePeriod): Trade[] {
  if (period === 'All Time') return allTrades;
  const now = new Date();
  let cutoff: Date;
  switch (period) {
    case 'Today':
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'This Week': {
      const day = now.getDay();
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      cutoff.setHours(0, 0, 0, 0);
      break;
    }
    case 'This Month':
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'Last 3 Months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case 'Last 6 Months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case 'This Year':
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return allTrades;
  }
  return allTrades.filter(t => new Date(t.date) >= cutoff);
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [edges, setEdges] = useState<SetupEdge[]>([]);
  const [heatmap, setHeatmap] = useState<MistakeEntry[]>([]);
  const [equityCurve, setEquityCurve] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [bellRead, setBellRead] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [edgePeriod, setEdgePeriod] = useState<TimePeriod>('This Month');
  const [heatmapPeriod, setHeatmapPeriod] = useState<TimePeriod>('This Week');
  const [equityPeriod, setEquityPeriod] = useState<TimePeriod>('This Month');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const chartRef = useRef<ChartJS<'line'>>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const data = storage.getTrades();
    setTrades(data);
    // Dashboard uses custom date range
    const dashFiltered = data.filter(t => t.date >= dateFrom && t.date <= dateTo);
    setStats(getTradeStats(dashFiltered));
    setEdges(getSetupEdges(filterByPeriod(data, edgePeriod)));
    setHeatmap(getMistakeHeatmap(filterByPeriod(data, heatmapPeriod)));
    setEquityCurve(getEquityCurve(filterByPeriod(data, equityPeriod)));
  }, [dateFrom, dateTo, edgePeriod, heatmapPeriod, equityPeriod]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!stats) return null;

  const recentTrades = trades.slice(0, 5);


  const equityChartData = {
    labels: equityCurve.labels,
    datasets: [{
      data: equityCurve.data,
      borderColor: '#10b981',
      backgroundColor: (ctx: any) => {
        const chart = ctx.chart;
        const { ctx: context, chartArea } = chart;
        if (!chartArea) return 'rgba(16,185,129,0.1)';
        const gradient = context.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(16,185,129,0.15)');
        gradient.addColorStop(1, 'rgba(16,185,129,0.01)');
        return gradient;
      },
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverRadius: 6,
    }]
  };

  const equityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 600 as const },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `P&L: ₹${ctx.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          callback: (val: any) => `₹${(val / 1000).toFixed(0)}k`
        }
      }
    }
  };

  const winRateData = {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [stats.wins, stats.losses],
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 0,
      cutout: '72%',
      borderRadius: 4,
    }]
  };

  const winRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>{(() => {
            const hr = new Date().getHours();
            if (hr < 12) return 'Good morning';
            if (hr < 17) return 'Good afternoon';
            return 'Good evening';
          })()}, {userName}! 👋</h2>
          <p>Review your trading performance and grow with discipline.</p>
        </div>
        <div className="page-header-right">
          <div className="date-range-wrap" ref={datePickerRef}>
            <button className="header-btn date-range-btn" onClick={() => setShowDatePicker(v => !v)}>
              <Calendar size={15} />
              {(() => {
                const fmt = (d: string) => new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `${fmt(dateFrom)} – ${fmt(dateTo)}, ${new Date(dateTo + 'T00:00').getFullYear()}`;
              })()}
              <ChevronDown size={13} />
            </button>
            {showDatePicker && (
              <div className="date-range-dropdown">
                <label className="date-range-label">Start Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="date-range-input" />
                <label className="date-range-label">End Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="date-range-input" />
              </div>
            )}
          </div>
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
                        <div className={`notif-trade-value ${pnlColorClass(pnl)}`}>{formatCurrency(pnl)}</div>
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
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/'); }}>
                  <LayoutDashboard size={14} /> Dashboard
                </button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}>
                  <Settings size={14} /> Settings
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { logout(); }} style={{ color: 'var(--red-500)' }}>
                  <Activity size={14} /> Sign Out
                </button>
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* ===== STAT CARDS ===== */}
        <div className="stat-cards">
          <div className="stat-card animate-in">
            <div className="stat-card-icon green"><FaSackDollar size={22} /></div>
            <div className="stat-card-label">Net P&L</div>
            <div className={`stat-card-value ${pnlColorClass(stats.netPnL)}`}>
              {formatCurrency(stats.netPnL)}
            </div>
            <div className={`stat-card-change ${stats.pnlChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.pnlChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.pnlChangeVsLastWeek).toFixed(1)}% vs last week
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon blue"><Target size={22} /></div>
            <div className="stat-card-label">Win Rate</div>
            <div className="stat-card-value">{stats.winRate.toFixed(1)}%</div>
            <div className={`stat-card-change ${stats.winRateChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.winRateChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.winRateChangeVsLastWeek).toFixed(1)}% vs last week
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon purple"><Scale size={22} /></div>
            <div className="stat-card-label">Avg Risk : Reward</div>
            <div className="stat-card-value">1 : {stats.avgRiskReward.toFixed(2)}</div>
            <div className={`stat-card-change ${stats.rrChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.rrChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.rrChangeVsLastWeek).toFixed(2)} vs last week
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon orange"><BarChart3 size={22} /></div>
            <div className="stat-card-label">Expectancy</div>
            <div className={`stat-card-value ${pnlColorClass(stats.expectancy)}`}>
              {formatCurrency(stats.expectancy)}/trade
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon red"><TrendingDown size={22} /></div>
            <div className="stat-card-label">Max Drawdown</div>
            <div className="stat-card-value negative">
              -{formatCurrency(stats.maxDrawdown).replace('+', '')}
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon teal"><Activity size={22} /></div>
            <div className="stat-card-label">Trades This Week</div>
            <div className="stat-card-value">{stats.tradesThisWeek}</div>
            <div className="stat-card-change">
              <span style={{ color: 'var(--green-600)', fontWeight: 600 }}>{stats.wins} W</span>
              {' · '}
              <span style={{ color: 'var(--red-500)', fontWeight: 600 }}>{stats.losses} L</span>
            </div>
          </div>
        </div>

        {/* ===== EQUITY CURVE + WIN RATE ===== */}
        <div className="dashboard-grid">
          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">
                <LineChart size={18} color="var(--green-600)" />
                Equity Curve
              </div>
              <div className="select-wrapper" style={{ minWidth: 0 }}>
                <select className="header-select" value={equityPeriod} onChange={e => setEquityPeriod(e.target.value as TimePeriod)}>
                  {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="chart-container">
              <Line ref={chartRef} data={equityChartData} options={equityChartOptions} />
            </div>
          </div>

          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">
                <PieChart size={18} color="var(--green-600)" />
                Performance Snapshot
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {(() => {
                  const today = new Date();
                  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return `${fmt(monthStart)} – ${fmt(today)}`;
                })()}
              </span>
            </div>
            <div className="donut-stats">
              <div className="donut-chart-wrap">
                <Doughnut data={winRateData} options={winRateOptions} />
                <div className="donut-center-label">
                  <div className="value">{stats.winRate.toFixed(1)}%</div>
                  <div className="label">Win Rate</div>
                </div>
              </div>
              <div className="donut-legend">
                <div className="donut-legend-item">
                  <div className="donut-legend-dot" style={{ background: '#10b981' }}></div>
                  <span className="donut-legend-label">Wins</span>
                  <span className="donut-legend-value">{stats.wins}</span>
                </div>
                <div className="donut-legend-item">
                  <div className="donut-legend-dot" style={{ background: '#ef4444' }}></div>
                  <span className="donut-legend-label">Losses</span>
                  <span className="donut-legend-value">{stats.losses}</span>
                </div>
                <div className="donut-total">
                  <BarChart3 size={14} /> Total Trades <span>{stats.totalTrades}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== EDGE BY SETUP + MISTAKE HEATMAP ===== */}
        <div className="dashboard-grid-3">
          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">
                <CheckCircle2 size={18} color="var(--green-600)" />
                Edge by Setup
              </div>
              <div className="select-wrapper" style={{ minWidth: 0 }}>
                <select className="header-select" value={edgePeriod} onChange={e => setEdgePeriod(e.target.value as TimePeriod)}>
                  {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="card-body-np">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Setup</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                    <th>Avg R:R</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.map(edge => (
                    <tr key={edge.setup}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ marginRight: 6, display: 'inline-flex' }}>
                          {edge.setup === 'EMA + VWAP' ? <LayoutGrid size={14} /> : edge.setup === 'Breakout' ? <Rocket size={14} /> : <RefreshCw size={14} />}
                        </span>
                        {edge.setup}
                      </td>
                      <td>{edge.trades}</td>
                      <td>
                        <div className="winrate-bar">
                          <span className="winrate-bar-value">{edge.winRate.toFixed(1)}%</span>
                          <div className="winrate-bar-track">
                            <div className="winrate-bar-fill" style={{ width: `${edge.winRate}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>{edge.avgRR}</td>
                      <td>
                        <span className={pnlColorClass(edge.pnl)} style={{ fontWeight: 600 }}>
                          {formatCurrency(edge.pnl)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">
                <Flame size={18} color="var(--orange-500)" />
                Mistake Heatmap
              </div>
              <div className="select-wrapper" style={{ minWidth: 0 }}>
                <select className="header-select" value={heatmapPeriod} onChange={e => setHeatmapPeriod(e.target.value as TimePeriod)}>
                  {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="heatmap-grid">
              <div className="heatmap-header">
                <div></div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                  <div key={d} className="heatmap-header-cell">{d}</div>
                ))}
              </div>
              {heatmap.map(entry => (
                <div key={entry.mistake} className="heatmap-row">
                  <div className="heatmap-label">{entry.mistake}</div>
                  {entry.counts.map((count, i) => (
                    <div
                      key={i}
                      className={`heatmap-cell ${count === 0 ? 'empty' : count === 1 ? 'low' : count === 2 ? 'medium' : 'high'}`}
                    >
                      {count > 0 ? count : '0'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== RECENT TRADES ===== */}
        <div className="card animate-in">
          <div className="recent-trades-header">
            <h3><Clock size={18} style={{ marginRight: 6 }} /> Recent Trades</h3>
            <Link to="/all-trades" className="view-all-link">
              View All Trades <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body-np">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Instrument</th>
                  <th>Setup</th>
                  <th>Direction</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>R:R</th>
                  <th>Result</th>
                  <th>Mistake</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(trade => {
                  const pnl = calcPnL(trade);
                  const rr = calcRiskReward(trade);
                  return (
                    <tr key={trade.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{trade.instrument}</td>
                      <td>
                        <span className="badge teal">{trade.setup}</span>
                      </td>
                      <td>
                        <span className={`direction-badge ${trade.direction.toLowerCase()}`}>
                          {trade.direction === 'Long' ? '↑' : '↓'} {trade.direction}
                        </span>
                      </td>
                      <td>{trade.entryPrice.toLocaleString()}</td>
                      <td>{trade.exitPrice.toLocaleString()}</td>
                      <td>1 : {rr.toFixed(1)}</td>
                      <td>
                        <span className={pnlColorClass(pnl)} style={{ fontWeight: 600 }}>
                          {formatCurrency(pnl)}
                        </span>
                      </td>
                      <td>
                        {trade.mistake ? (
                          <span className="badge orange">{trade.mistake}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
