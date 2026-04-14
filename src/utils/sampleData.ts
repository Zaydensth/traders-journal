import type { Trade } from '../types/trade';
import { storage } from './storage';

const sampleTrades: Trade[] = [
  {
    id: '1', date: '2024-11-07', time: '09:45', instrument: 'NIFTY 50',
    assetType: 'Index', setup: 'EMA + VWAP', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 24120, exitPrice: 24450, stopLoss: 24000,
    targetPrice: 24450, quantity: 50, fees: 75, result: 'Profit',
    notes: 'Clean EMA crossover above VWAP with good volume.', emotion: 'Confidence',
    mistake: '', tags: ['Trend Following', 'High Volume'], screenshot: ''
  },
  {
    id: '2', date: '2024-11-06', time: '11:20', instrument: 'BANKNIFTY',
    assetType: 'Index', setup: 'Breakout', timeframe: '15 Minute',
    direction: 'Short', entryPrice: 52300, exitPrice: 51900, stopLoss: 52700,
    targetPrice: 51800, quantity: 25, fees: 75, result: 'Profit',
    notes: 'Support break with volume confirmation.', emotion: 'Neutral',
    mistake: 'Early Entry', tags: ['Breakout'], screenshot: ''
  },
  {
    id: '3', date: '2024-11-05', time: '14:10', instrument: 'RELIANCE',
    assetType: 'Stocks', setup: 'Reversal', timeframe: '30 Minute',
    direction: 'Long', entryPrice: 2980, exitPrice: 3120, stopLoss: 2910,
    targetPrice: 3150, quantity: 100, fees: 50, result: 'Profit',
    notes: 'Hammer at support zone with RSI divergence.', emotion: 'Confidence',
    mistake: '', tags: ['Reversal', 'RSI Divergence'], screenshot: ''
  },
  {
    id: '4', date: '2024-11-04', time: '10:05', instrument: 'TATA MOTORS',
    assetType: 'Stocks', setup: 'Breakout', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 865, exitPrice: 855, stopLoss: 850,
    targetPrice: 890, quantity: 200, fees: 50, result: 'Loss',
    notes: 'False breakout. Should have waited for retest.', emotion: 'FOMO',
    mistake: 'No Stop Loss', tags: [], screenshot: ''
  },
  {
    id: '5', date: '2024-11-03', time: '13:30', instrument: 'NIFTY 50',
    assetType: 'Index', setup: 'EMA + VWAP', timeframe: '5 Minute',
    direction: 'Short', entryPrice: 24340, exitPrice: 24280, stopLoss: 24400,
    targetPrice: 24200, quantity: 50, fees: 75, result: 'Profit',
    notes: 'Weak bounce at VWAP. Took quick scalp.', emotion: 'Neutral',
    mistake: 'Overtrading', tags: [], screenshot: ''
  },
  {
    id: '6', date: '2024-11-02', time: '09:50', instrument: 'HDFC BANK',
    assetType: 'Stocks', setup: 'Reversal', timeframe: '30 Minute',
    direction: 'Long', entryPrice: 1640, exitPrice: 1680, stopLoss: 1620,
    targetPrice: 1700, quantity: 150, fees: 50, result: 'Profit',
    notes: 'Morning star at support. Good risk/reward.', emotion: 'Confidence',
    mistake: '', tags: ['Reversal'], screenshot: ''
  },
  {
    id: '7', date: '2024-11-01', time: '10:15', instrument: 'INFY',
    assetType: 'Stocks', setup: 'Breakout', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 1450, exitPrice: 1470, stopLoss: 1435,
    targetPrice: 1490, quantity: 200, fees: 50, result: 'Profit',
    notes: 'Clean break above consolidation range.', emotion: 'Neutral',
    mistake: '', tags: ['Breakout'], screenshot: ''
  },
  {
    id: '8', date: '2024-10-31', time: '11:00', instrument: 'NIFTY 50',
    assetType: 'Index', setup: 'EMA + VWAP', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 24000, exitPrice: 24180, stopLoss: 23900,
    targetPrice: 24200, quantity: 50, fees: 75, result: 'Profit',
    notes: 'Strong bounce off EMA support.', emotion: 'Confidence',
    mistake: '', tags: ['Trend Following'], screenshot: ''
  },
  {
    id: '9', date: '2024-10-30', time: '12:45', instrument: 'SBIN',
    assetType: 'Stocks', setup: 'Reversal', timeframe: '1 Hour',
    direction: 'Long', entryPrice: 780, exitPrice: 770, stopLoss: 765,
    targetPrice: 800, quantity: 300, fees: 50, result: 'Loss',
    notes: 'Took reversal too early. No confirmation.', emotion: 'Fear',
    mistake: 'Early Entry', tags: [], screenshot: ''
  },
  {
    id: '10', date: '2024-10-29', time: '10:30', instrument: 'BANKNIFTY',
    assetType: 'Index', setup: 'EMA + VWAP', timeframe: '5 Minute',
    direction: 'Long', entryPrice: 51500, exitPrice: 51800, stopLoss: 51300,
    targetPrice: 51900, quantity: 25, fees: 75, result: 'Profit',
    notes: 'Perfect VWAP bounce after gap up.', emotion: 'Confidence',
    mistake: '', tags: ['Trend Following', 'Gap Play'], screenshot: ''
  },
  /* ─── April 2026 trades (current month) ─── */
  {
    id: '11', date: '2026-04-14', time: '09:30', instrument: 'NIFTY 50',
    assetType: 'Index', setup: 'EMA + VWAP', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 23850, exitPrice: 24120, stopLoss: 23720,
    targetPrice: 24150, quantity: 50, fees: 75, result: 'Profit',
    notes: 'Strong bullish momentum off morning gap.', emotion: 'Confidence',
    mistake: '', tags: ['Trend Following', 'Gap Play'], screenshot: ''
  },
  {
    id: '12', date: '2026-04-11', time: '10:15', instrument: 'RELIANCE',
    assetType: 'Stocks', setup: 'Breakout', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 2920, exitPrice: 2985, stopLoss: 2880,
    targetPrice: 3000, quantity: 100, fees: 50, result: 'Profit',
    notes: 'Breakout above resistance with volume confirmation.', emotion: 'Neutral',
    mistake: '', tags: ['Breakout', 'High Volume'], screenshot: ''
  },
  {
    id: '13', date: '2026-04-09', time: '11:45', instrument: 'BANKNIFTY',
    assetType: 'Index', setup: 'Reversal', timeframe: '30 Minute',
    direction: 'Short', entryPrice: 53200, exitPrice: 52850, stopLoss: 53450,
    targetPrice: 52800, quantity: 25, fees: 75, result: 'Profit',
    notes: 'Double top at resistance zone. Clean rejection.', emotion: 'Confidence',
    mistake: '', tags: ['Reversal', 'Double Top'], screenshot: ''
  },
  {
    id: '14', date: '2026-04-07', time: '14:20', instrument: 'TATA MOTORS',
    assetType: 'Stocks', setup: 'EMA + VWAP', timeframe: '15 Minute',
    direction: 'Long', entryPrice: 895, exitPrice: 880, stopLoss: 875,
    targetPrice: 920, quantity: 200, fees: 50, result: 'Loss',
    notes: 'Late entry after EMA cross. Reversed quickly.', emotion: 'FOMO',
    mistake: 'Late Entry', tags: [], screenshot: ''
  },
  {
    id: '15', date: '2026-04-03', time: '09:55', instrument: 'HDFC BANK',
    assetType: 'Stocks', setup: 'Breakout', timeframe: '30 Minute',
    direction: 'Long', entryPrice: 1710, exitPrice: 1755, stopLoss: 1685,
    targetPrice: 1760, quantity: 150, fees: 50, result: 'Profit',
    notes: 'Gap up followed by flag breakout. Strong trend day.', emotion: 'Confidence',
    mistake: '', tags: ['Breakout', 'Flag Pattern'], screenshot: ''
  },
];

export function loadSampleData(): void {
  // If user intentionally deleted all data, don't re-seed
  if (storage.isDataDeleted()) return;
  const existing = storage.getTrades();
  if (existing.length === 0) {
    storage.saveTrades(sampleTrades);
  } else {
    // Merge: add any sample trades whose IDs don't already exist
    const existingIds = new Set(existing.map(t => t.id));
    const newTrades = sampleTrades.filter(t => !existingIds.has(t.id));
    if (newTrades.length > 0) {
      storage.saveTrades([...existing, ...newTrades]);
    }
  }
}

