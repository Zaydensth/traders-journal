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

export interface DisciplineComponent {
  name: string;
  score: number;
  maxScore: number;
  icon: string;
  description: string;
}

export interface DisciplineBreakdown {
  overall: number;
  components: DisciplineComponent[];
}

export function getDisciplineScore(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return getDisciplineBreakdown(trades).overall;
}

export function getDisciplineBreakdown(trades: Trade[]): DisciplineBreakdown {
  if (trades.length === 0) {
    return {
      overall: 0,
      components: [
        { name: 'Trade Plan Adherence', score: 0, maxScore: 30, icon: '📋', description: 'Setup, SL, and exit rules followed' },
        { name: 'Patience & Timing', score: 0, maxScore: 20, icon: '⏱️', description: 'No early entries or overtrading' },
        { name: 'Risk Management', score: 0, maxScore: 20, icon: '🛡️', description: 'Fixed risk & no revenge trading' },
        { name: 'Emotional Control', score: 0, maxScore: 15, icon: '🧘', description: 'Calm execution, no FOMO/panic' },
        { name: 'Journaling & Review', score: 0, maxScore: 10, icon: '📒', description: 'Journal filled & mistakes identified' },
        { name: 'Consistency Bonus', score: 0, maxScore: 5, icon: '🔁', description: 'Rules followed across all trades' },
      ]
    };
  }

  // 1. Trade Plan Adherence (30 pts)
  //    Entry on valid setup → +10, SL respected → +10, Target/exit rules followed → +10
  const hasValidSetup = trades.filter(t => t.setup && t.setup !== '' && t.setup !== 'Custom').length;
  const entryScore = Math.round((hasValidSetup / trades.length) * 10);
  const hasSL = trades.filter(t => t.stopLoss > 0).length;
  const slRespected = Math.round((hasSL / trades.length) * 10);
  const hasTarget = trades.filter(t => t.targetPrice > 0).length;
  const targetScore = Math.round((hasTarget / trades.length) * 10);
  const planScore = entryScore + slRespected + targetScore;

  // 2. Patience & Timing (20 pts)
  //    No early entries → +10, No overtrading/impulsive → +10
  const earlyEntries = trades.filter(t => t.mistake === 'Early Entry').length;
  const patienceEntry = Math.max(0, 10 - (earlyEntries * 10));
  const overtrading = trades.filter(t => t.mistake === 'Overtrading').length;
  const patienceOvertrading = Math.max(0, 10 - (overtrading * 5));
  const patienceScore = Math.min(20, patienceEntry + patienceOvertrading);

  // 3. Risk Management (20 pts)
  //    Fixed risk per trade followed → +10, No revenge trading → +10
  const rrs = trades.map(t => calcRiskReward(t)).filter(r => r > 0);
  const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  const riskFixed = Math.min(10, Math.round(avgRR * 4) + (hasSL === trades.length ? 4 : 0));
  const revengeTrades = trades.filter(t => t.mistake === 'Revenge Trade').length;
  const riskRevenge = Math.max(0, 10 - (revengeTrades * 10));
  const riskScore = Math.min(20, riskFixed + riskRevenge);

  // 4. Emotional Control (15 pts)
  //    Calm execution → +5, No panic exits → +5, No FOMO → +5
  const neutralEmotion = trades.filter(t => t.emotion === 'Neutral' || t.emotion === 'Confidence').length;
  const calmScore = Math.round((neutralEmotion / trades.length) * 5);
  const lateExits = trades.filter(t => t.mistake === 'Late Exit' || t.mistake === 'Moved SL').length;
  const panicScore = Math.max(0, 5 - (lateExits * 2));
  const fomoTrades = trades.filter(t => t.emotion === 'FOMO').length;
  const fomoScore = Math.max(0, 5 - (fomoTrades * 5));
  const emotionScore = Math.min(15, calmScore + panicScore + fomoScore);

  // 5. Journaling & Review (10 pts)
  //    Journal filled properly → +5, Mistakes identified → +5
  const hasNotes = trades.filter(t => t.notes && t.notes.trim().length > 10).length;
  const journalFilled = Math.round((hasNotes / trades.length) * 5);
  const hasMistakeLogged = trades.filter(t => t.mistake && t.mistake !== '' && t.mistake !== 'None').length;
  const noMistakeTrades = trades.filter(t => !t.mistake || t.mistake === '' || t.mistake === 'None').length;
  // Trades that had issues AND identified them = good. Clean trades = also good.
  const mistakeIdentified = Math.round(((hasMistakeLogged + noMistakeTrades) / trades.length) * 5);
  const journalScore = Math.min(10, journalFilled + mistakeIdentified);

  // 6. Consistency Bonus (5 pts)
  //    All trades followed rules → +5
  const totalMistakes = trades.filter(t => t.mistake && t.mistake !== '' && t.mistake !== 'None').length;
  const consistencyScore = totalMistakes === 0 ? 5 : Math.max(0, 5 - totalMistakes);

  const overall = planScore + patienceScore + riskScore + emotionScore + journalScore + consistencyScore;

  return {
    overall: Math.min(100, overall),
    components: [
      { name: 'Trade Plan Adherence', score: planScore, maxScore: 30, icon: '📋', description: 'Setup, SL, and exit rules followed' },
      { name: 'Patience & Timing', score: patienceScore, maxScore: 20, icon: '⏱️', description: 'No early entries or overtrading' },
      { name: 'Risk Management', score: riskScore, maxScore: 20, icon: '🛡️', description: 'Fixed risk & no revenge trading' },
      { name: 'Emotional Control', score: emotionScore, maxScore: 15, icon: '🧘', description: 'Calm execution, no FOMO/panic' },
      { name: 'Journaling & Review', score: journalScore, maxScore: 10, icon: '📒', description: 'Journal filled & mistakes identified' },
      { name: 'Consistency Bonus', score: consistencyScore, maxScore: 5, icon: '🔁', description: 'Rules followed across all trades' },
    ]
  };
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
