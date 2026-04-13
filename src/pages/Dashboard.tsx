import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  DollarSign, Target, Scale, BarChart3, TrendingDown, TrendingUp,
  Calendar, Settings, Bell, ChevronDown, Clock,
  Flame, CheckCircle2, LineChart, PieChart,
  ArrowRight, LayoutGrid, Rocket, RefreshCw
} from 'lucide-react';
import type { Trade, TradeStats, SetupEdge, MistakeEntry } from '../types/trade';
import { storage } from '../utils/storage';
import {
  getTradeStats,
  getSetupEdges,
  getMistakeHeatmap,
  getEquityCurve,

  calcPnL,
  calcRiskReward,
  formatCurrency
} from '../utils/calculations';
import { loadSampleData } from '../utils/sampleData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [edges, setEdges] = useState<SetupEdge[]>([]);
  const [heatmap, setHeatmap] = useState<MistakeEntry[]>([]);
  const [equityCurve, setEquityCurve] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    loadSampleData();
    const data = storage.getTrades();
    setTrades(data);
    setStats(getTradeStats(data));
    setEdges(getSetupEdges(data));
    setHeatmap(getMistakeHeatmap(data));
    setEquityCurve(getEquityCurve(data));

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
          <h2>Good morning, Trader! 👋</h2>
          <p>Review your trading performance and grow with discipline.</p>
        </div>
        <div className="page-header-right">
          <button className="header-btn"><Calendar size={15} /> This Week</button>
          <button className="header-btn"><Settings size={15} /></button>
          <button className="header-btn"><Bell size={15} /></button>
          <div className="user-avatar">RT</div>
        </div>
      </div>

      <div className="page-content">
        {/* ===== STAT CARDS ===== */}
        <div className="stat-cards">
          <div className="stat-card animate-in">
            <div className="stat-card-icon green"><DollarSign size={20} /></div>
            <div className="stat-card-label">Net P&L</div>
            <div className={`stat-card-value ${stats.netPnL >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(stats.netPnL)}
            </div>
            <div className={`stat-card-change ${stats.pnlChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.pnlChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.pnlChangeVsLastWeek).toFixed(1)}% vs last week
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon blue"><Target size={20} /></div>
            <div className="stat-card-label">Win Rate</div>
            <div className="stat-card-value">{stats.winRate.toFixed(1)}%</div>
            <div className={`stat-card-change ${stats.winRateChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.winRateChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.winRateChangeVsLastWeek).toFixed(1)}% vs last week
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon purple"><Scale size={20} /></div>
            <div className="stat-card-label">Avg Risk : Reward</div>
            <div className="stat-card-value">1 : {stats.avgRiskReward.toFixed(2)}</div>
            <div className={`stat-card-change ${stats.rrChangeVsLastWeek >= 0 ? 'up' : 'down'}`}>
              {stats.rrChangeVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(stats.rrChangeVsLastWeek).toFixed(2)} vs last week
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon orange"><BarChart3 size={20} /></div>
            <div className="stat-card-label">Expectancy</div>
            <div className={`stat-card-value ${stats.expectancy >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(stats.expectancy)}/trade
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon red"><TrendingDown size={20} /></div>
            <div className="stat-card-label">Max Drawdown</div>
            <div className="stat-card-value negative">
              -{formatCurrency(stats.maxDrawdown).replace('+', '')}
            </div>
          </div>

          <div className="stat-card animate-in">
            <div className="stat-card-icon teal"><TrendingUp size={20} /></div>
            <div className="stat-card-label">Trades This Week</div>
            <div className="stat-card-value">{stats.tradesThisWeek}</div>
            <div className="stat-card-change">
              {stats.wins} Winners · {stats.losses} Losers
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
              <button className="header-btn" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>Daily <ChevronDown size={13} /></button>
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
              <button className="header-btn" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>This Month <ChevronDown size={13} /></button>
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
                        <span className={edge.pnl >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
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
              <button className="header-btn" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>This Week <ChevronDown size={13} /></button>
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
                        <span className={pnl >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
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
