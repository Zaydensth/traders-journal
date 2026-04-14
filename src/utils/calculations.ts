import type { Trade, TradeStats, SetupEdge, MistakeEntry } from '../types/trade';

export function calcPnL(trade: Trade): number {
  const multiplier = trade.direction === 'Long' ? 1 : -1;
  return ((trade.exitPrice - trade.entryPrice) * multiplier * trade.quantity) - trade.fees;
}

export function calcRiskReward(trade: Trade): number {
  const risk = Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity;
  if (risk === 0) return 0;
  const reward = Math.abs(calcPnL(trade) + trade.fees);
  return reward / risk;
}

export function calcRMultiple(trade: Trade): number {
  const risk = Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity;
  if (risk === 0) return 0;
  return calcPnL(trade) / risk;
}

export function getTradeStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0, wins: 0, losses: 0, winRate: 0, netPnL: 0,
      avgRiskReward: 0, expectancy: 0, maxDrawdown: 0,
      bestDay: { date: '-', pnl: 0 }, losingStreak: { count: 0, period: '-' },
      tradesThisWeek: 0, pnlChangeVsLastWeek: 0,
      winRateChangeVsLastWeek: 0, rrChangeVsLastWeek: 0
    };
  }

  const wins = trades.filter(t => calcPnL(t) > 0);
  const losses = trades.filter(t => calcPnL(t) <= 0);
  const winRate = (wins.length / trades.length) * 100;
  const netPnL = trades.reduce((sum, t) => sum + calcPnL(t), 0);

  const rrs = trades.map(t => calcRiskReward(t)).filter(r => r > 0);
  const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + calcPnL(t), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + calcPnL(t), 0) / losses.length) : 0;
  const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss);

  // Max Drawdown
  let peak = 0, maxDD = 0, running = 0;
  for (const t of trades.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    running += calcPnL(t);
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }

  // Best Day
  const dayMap = new Map<string, number>();
  trades.forEach(t => {
    const pnl = calcPnL(t);
    dayMap.set(t.date, (dayMap.get(t.date) || 0) + pnl);
  });
  let bestDay = { date: '-', pnl: 0 };
  dayMap.forEach((pnl, date) => {
    if (pnl > bestDay.pnl) bestDay = { date, pnl };
  });

  // Losing Streak
  let maxStreak = 0, currentStreak = 0, streakStart = '', streakEnd = '';
  let curStart = '', curEnd = '';
  const sorted = trades.slice().sort((a, b) => a.date.localeCompare(b.date));
  for (const t of sorted) {
    if (calcPnL(t) <= 0) {
      currentStreak++;
      if (currentStreak === 1) curStart = t.date;
      curEnd = t.date;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        streakStart = curStart;
        streakEnd = curEnd;
      }
    } else {
      currentStreak = 0;
    }
  }

  // This week trades
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekTrades = trades.filter(t => new Date(t.date) >= weekStart);

  // Last week comparison
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d >= lastWeekStart && d < weekStart;
  });

  const lastPnL = lastWeekTrades.reduce((s, t) => s + calcPnL(t), 0);
  const lastWins = lastWeekTrades.filter(t => calcPnL(t) > 0).length;
  const lastWR = lastWeekTrades.length > 0 ? (lastWins / lastWeekTrades.length) * 100 : 0;
  const lastRRs = lastWeekTrades.map(t => calcRiskReward(t)).filter(r => r > 0);
  const lastAvgRR = lastRRs.length > 0 ? lastRRs.reduce((a, b) => a + b, 0) / lastRRs.length : 0;

  const thisPnL = thisWeekTrades.reduce((s, t) => s + calcPnL(t), 0);
  const thisWins = thisWeekTrades.filter(t => calcPnL(t) > 0).length;
  const thisWR = thisWeekTrades.length > 0 ? (thisWins / thisWeekTrades.length) * 100 : 0;
  const thisRRs = thisWeekTrades.map(t => calcRiskReward(t)).filter(r => r > 0);
  const thisAvgRR = thisRRs.length > 0 ? thisRRs.reduce((a, b) => a + b, 0) / thisRRs.length : 0;

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    netPnL,
    avgRiskReward: avgRR,
    expectancy,
    maxDrawdown: maxDD,
    bestDay,
    losingStreak: {
      count: maxStreak,
      period: maxStreak > 0 ? `${formatShortDate(streakStart)} – ${formatShortDate(streakEnd)}` : '-'
    },
    tradesThisWeek: thisWeekTrades.length,
    pnlChangeVsLastWeek: lastPnL !== 0 ? ((thisPnL - lastPnL) / Math.abs(lastPnL)) * 100 : 0,
    winRateChangeVsLastWeek: thisWR - lastWR,
    rrChangeVsLastWeek: thisAvgRR - lastAvgRR,
  };
}

export function getSetupEdges(trades: Trade[]): SetupEdge[] {
  const map = new Map<string, Trade[]>();
  trades.forEach(t => {
    if (!map.has(t.setup)) map.set(t.setup, []);
    map.get(t.setup)!.push(t);
  });

  return Array.from(map.entries()).map(([setup, tds]) => {
    const wins = tds.filter(t => calcPnL(t) > 0).length;
    const rrs = tds.map(t => calcRiskReward(t)).filter(r => r > 0);
    const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
    return {
      setup,
      trades: tds.length,
      winRate: (wins / tds.length) * 100,
      avgRR: `1 : ${avgRR.toFixed(2)}`,
      pnl: tds.reduce((s, t) => s + calcPnL(t), 0),
    };
  }).sort((a, b) => b.pnl - a.pnl);
}

export function getMistakeHeatmap(trades: Trade[]): MistakeEntry[] {
  const mistakes = ['Early Entry', 'No Stop Loss', 'Overtrading', 'Revenge Trade', 'Moved SL', 'Late Exit'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return mistakes.map(mistake => {
    const counts = days.map((_, dayIdx) => {
      return trades.filter(t => {
        const d = new Date(t.date);
        const tradeDayIdx = d.getDay() - 1;
        return tradeDayIdx === dayIdx && t.mistake === mistake;
      }).length;
    });
    return { mistake, counts };
  });
}

export function getEquityCurve(trades: Trade[], mode: 'daily' | 'weekly' = 'daily'): { labels: string[]; data: number[] } {
  const sorted = trades.slice().sort((a, b) => a.date.localeCompare(b.date));

  if (mode === 'weekly') {
    // Group by ISO week
    const weeks = new Map<string, number>();
    sorted.forEach(t => {
      const d = new Date(t.date + 'T00:00');
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const weekStart = new Date(d.setDate(diff));
      const key = weekStart.toISOString().split('T')[0];
      weeks.set(key, (weeks.get(key) || 0) + calcPnL(t));
    });

    let running = 0;
    const labels: string[] = [];
    const data: number[] = [];
    for (const [weekDate, pnl] of weeks) {
      running += pnl;
      const d = new Date(weekDate + 'T00:00');
      labels.push(`W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('en-US', { month: 'short' })}`);
      data.push(running);
    }
    return { labels, data };
  }

  // Daily (default)
  let running = 0;
  const labels: string[] = [];
  const data: number[] = [];
  sorted.forEach(t => {
    running += calcPnL(t);
    const label = formatShortDate(t.date);
    labels.push(label);
    data.push(running);
  });
  return { labels, data };
}

export function getDisciplineScore(trades: Trade[]): number {
  if (trades.length === 0) return 100;
  const mistakeTrades = trades.filter(t => t.mistake && t.mistake !== '' && t.mistake !== 'None').length;
  const penalty = (mistakeTrades / trades.length) * 50;
  return Math.max(0, Math.round(100 - penalty));
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${symbol}${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr || dateStr === '-') return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
