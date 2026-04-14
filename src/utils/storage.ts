import type { Trade } from '../types/trade';

const STORAGE_KEY = 'traders_journal_data';

export const storage = {
  getTrades: (): Trade[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTrades: (trades: Trade[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    localStorage.removeItem('tj_data_deleted');
  },

  addTrade: (trade: Trade): void => {
    const trades = storage.getTrades();
    trades.unshift(trade);
    storage.saveTrades(trades);
  },

  updateTrade: (id: string, updated: Trade): void => {
    const trades = storage.getTrades();
    const idx = trades.findIndex(t => t.id === id);
    if (idx !== -1) {
      trades[idx] = updated;
      storage.saveTrades(trades);
    }
  },

  deleteTrade: (id: string): void => {
    const trades = storage.getTrades().filter(t => t.id !== id);
    storage.saveTrades(trades);
  },

  generateId: (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
};
