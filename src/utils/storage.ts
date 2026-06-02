import type { Trade, CustomSetup } from '../types/trade';
import type { ChecklistTemplate, ChecklistRun, CurrentRun } from '../types/checklist';
import { getDefaultChecklists, getDefaultRuns, getDefaultCurrentRun } from '../types/checklist';

const BASE_KEY = 'traders_journal_data';
let _uid: string | null = null;

function getKey(): string {
  return _uid ? `${BASE_KEY}_${_uid}` : `${BASE_KEY}_none`;
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
  },

  getCustomSetups: (): CustomSetup[] => {
    const key = _uid ? `tj_setups_${_uid}` : 'tj_setups_none';
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  saveCustomSetups: (setups: CustomSetup[]): void => {
    const key = _uid ? `tj_setups_${_uid}` : 'tj_setups_none';
    localStorage.setItem(key, JSON.stringify(setups));
  },

  /* ─── Trading Checklists ─── */
  getChecklists: (): ChecklistTemplate[] => {
    const key = _uid ? `tj_checklists_${_uid}` : 'tj_checklists_none';
    const data = localStorage.getItem(key);
    if (data === null) {
      const seed = getDefaultChecklists();
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  },

  saveChecklists: (list: ChecklistTemplate[]): void => {
    const key = _uid ? `tj_checklists_${_uid}` : 'tj_checklists_none';
    localStorage.setItem(key, JSON.stringify(list));
  },

  getChecklistRuns: (): ChecklistRun[] => {
    const key = _uid ? `tj_checklist_runs_${_uid}` : 'tj_checklist_runs_none';
    const data = localStorage.getItem(key);
    if (data === null) {
      const seed = getDefaultRuns();
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  },

  saveChecklistRuns: (list: ChecklistRun[]): void => {
    const key = _uid ? `tj_checklist_runs_${_uid}` : 'tj_checklist_runs_none';
    localStorage.setItem(key, JSON.stringify(list));
  },

  getCurrentRun: (): CurrentRun => {
    const key = _uid ? `tj_checklist_current_${_uid}` : 'tj_checklist_current_none';
    const data = localStorage.getItem(key);
    if (data === null) {
      const seed = getDefaultCurrentRun();
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  },

  saveCurrentRun: (cr: CurrentRun): void => {
    const key = _uid ? `tj_checklist_current_${_uid}` : 'tj_checklist_current_none';
    localStorage.setItem(key, JSON.stringify(cr));
  },
};
