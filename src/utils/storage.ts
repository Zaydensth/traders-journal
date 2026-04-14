import type { Trade } from '../types/trade';

const BASE_KEY = 'traders_journal_data';
let _uid: string | null = null;

function getKey(): string {
  return _uid ? `${BASE_KEY}_${_uid}` : BASE_KEY;
}

function getDeletedKey(): string {
  return _uid ? `tj_data_deleted_${_uid}` : 'tj_data_deleted';
}

export const storage = {
  setUser: (uid: string | null): void => {
    _uid = uid;
  },

  getTrades: (): Trade[] => {
    const data = localStorage.getItem(getKey());
    return data ? JSON.parse(data) : [];
  },

  saveTrades: (trades: Trade[]): void => {
    localStorage.setItem(getKey(), JSON.stringify(trades));
    localStorage.removeItem(getDeletedKey());
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

  deleteAllTrades: (): void => {
    localStorage.removeItem(getKey());
    localStorage.setItem(getDeletedKey(), 'true');
  },

  isDataDeleted: (): boolean => {
    return localStorage.getItem(getDeletedKey()) === 'true';
  },

  generateId: (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
};
