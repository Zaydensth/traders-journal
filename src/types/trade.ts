export interface Trade {
  id: string;
  date: string;
  time: string;
  exitTime?: string;
  instrument: string;
  assetType: 'Index' | 'Stocks' | 'Forex' | 'Crypto' | 'Options';
  setup: string;
  timeframe: string;
  direction: 'Long' | 'Short';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  targetPrice: number;
  quantity: number;
  fees: number;
  result: 'Profit' | 'Loss';
  notes: string;
  emotion: string;
  mistake: string;
  tags: string[];
  screenshot?: string;
}

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnL: number;
  avgRiskReward: number;
  expectancy: number;
  maxDrawdown: number;
  bestDay: { date: string; pnl: number };
  losingStreak: { count: number; period: string };
  tradesThisWeek: number;
  pnlChangeVsLastWeek: number;
  winRateChangeVsLastWeek: number;
  rrChangeVsLastWeek: number;
}

export interface SetupEdge {
  setup: string;
  trades: number;
  winRate: number;
  avgRR: string;
  pnl: number;
}

export interface MistakeEntry {
  mistake: string;
  counts: number[];
}

export const SETUPS = [
  'EMA + VWAP',
  'Breakout',
  'Reversal',
  'Trend Following',
  'Scalp',
  'Gap Fill',
  'Custom'
];

export const EMOTIONS = ['Neutral', 'Fear', 'Greed', 'Confidence', 'FOMO'];

export const MISTAKES = [
  'Early Entry',
  'No Stop Loss',
  'Overtrading',
  'Revenge Trade',
  'Moved SL',
  'Late Exit'
];

export const TIMEFRAMES = ['1 Minute', '5 Minute', '15 Minute', '30 Minute', '1 Hour', '4 Hour', 'Daily'];

export const ASSET_TYPES: Trade['assetType'][] = ['Index', 'Stocks', 'Forex', 'Crypto', 'Options'];
