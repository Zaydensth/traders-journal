import { storage } from './storage';
import { calcPnL, formatCurrency } from './calculations';

export interface AppNotification {
  id: string;
  kind: 'trade' | 'checklist';
  title: string;
  value: string;
  valueClass: 'positive' | 'negative' | 'neutral';
  dot: 'green' | 'red' | 'blue';
  date: string;                       // YYYY-MM-DD
  link: string;                       // route to navigate to when clicked
  state?: Record<string, unknown>;    // router state (e.g. open a specific trade)
}

// Build the notification feed from real app activity. Each notification knows
// where it should take the user when clicked (link + optional router state).
export function getNotifications(): AppNotification[] {
  const out: AppNotification[] = [];

  storage.getTrades().forEach(t => {
    const pnl = calcPnL(t);
    out.push({
      id: `trade-${t.id}`,
      kind: 'trade',
      title: `${t.instrument || 'Trade'} · ${t.direction}`,
      value: formatCurrency(pnl),
      valueClass: pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral',
      dot: pnl >= 0 ? 'green' : 'red',
      date: t.date,
      link: '/all-trades',
      state: { viewTradeId: t.id },
    });
  });

  storage.getChecklistRuns().forEach(r => {
    out.push({
      id: `run-${r.id}`,
      kind: 'checklist',
      title: r.checklistName,
      value: `Checklist · ${r.percent}% completed`,
      valueClass: 'neutral',
      dot: 'blue',
      date: r.date,
      link: '/trading-checklist/history',
    });
  });

  return out.sort((a, b) => b.date.localeCompare(a.date));
}
