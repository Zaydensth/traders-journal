export type CheckResult = 'yes' | 'no' | 'na' | '';

export interface ChecklistItemDef {
  id: string;
  text: string;
  subtext?: string;
  required: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItemDef[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  sections: ChecklistSection[];
  createdAt: string;  // YYYY-MM-DD
  lastUsed: string;   // YYYY-MM-DD
}

export interface ChecklistRun {
  id: string;
  checklistId: string;
  checklistName: string;
  date: string;       // YYYY-MM-DD
  yes: number;
  no: number;
  na: number;
  total: number;
  percent: number;
}

// In-progress state of the checklist currently open in the runner
export interface CurrentRun {
  checklistId: string;
  answers: Record<string, CheckResult>;
  notes: Record<string, string>;
}

export const CHECKLIST_CATEGORIES = ['Intraday', 'Swing', 'Positional', 'Options', 'General'];

export function countPoints(t: ChecklistTemplate): number {
  return t.sections.reduce((sum, s) => sum + s.items.length, 0);
}

export function allItems(t: ChecklistTemplate): ChecklistItemDef[] {
  return t.sections.flatMap(s => s.items);
}

/* ─── default checklist templates (seeded on first use to match the client design) ─── */

function ymd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDefaultChecklists(): ChecklistTemplate[] {
  return [
    {
      id: 'default-pretrade',
      name: 'Pre-Trade Checklist',
      description: 'Review and confirm each point before entering a trade.',
      category: 'General',
      color: '#10b981',
      createdAt: '2024-10-15',
      lastUsed: ymd(0),
      sections: [
        {
          id: 'pt-main', title: 'Pre-Trade',
          items: [
            { id: 'pt1', text: 'Is the trend in my favor?', subtext: 'Higher timeframe trend alignment', required: true },
            { id: 'pt2', text: 'Is there a valid setup?', subtext: 'Based on my trading plan', required: true },
            { id: 'pt3', text: 'Is the risk-reward ratio acceptable?', subtext: 'Minimum 1:2 R:R', required: true },
            { id: 'pt4', text: 'Is my position size appropriate?', subtext: 'Risking less than 1–2% of capital', required: true },
            { id: 'pt5', text: 'Is the stop-loss level clearly defined?', required: true },
            { id: 'pt6', text: 'Is the target level clearly defined?', required: true },
            { id: 'pt7', text: 'Am I free from emotional bias?', subtext: 'No revenge trading or FOMO', required: true },
            { id: 'pt8', text: 'Is the market condition suitable?', subtext: 'Volatility, news, liquidity check', required: true },
            { id: 'pt9', text: 'Have I reviewed my recent trades?', subtext: 'Any lessons to apply?', required: true },
            { id: 'pt10', text: 'Am I fully focused and prepared?', subtext: 'No distractions, clear mind', required: true },
          ],
        },
      ],
    },
    {
      id: 'intraday',
      name: 'Intraday Trading Checklist',
      description: 'Checklist for my intraday trading setup and execution.',
      category: 'Intraday',
      color: '#10b981',
      createdAt: '2024-11-01',
      lastUsed: ymd(0),
      sections: [
        {
          id: 'in-setup', title: 'Setup',
          items: [
            { id: 'in1', text: 'Is the market trend clear and aligned with my strategy?', required: true },
            { id: 'in2', text: 'Have I identified key support and resistance levels?', required: true },
            { id: 'in3', text: 'Is my risk-reward ratio at least 1:2?', required: true },
            { id: 'in4', text: 'Is the volume confirming the price movement?', required: true },
            { id: 'in5', text: 'Have I checked for any major news events?', required: true },
          ],
        },
        {
          id: 'in-mindset', title: 'Mindset',
          items: [
            { id: 'in6', text: 'Am I calm and free from emotional bias?', required: true },
            { id: 'in7', text: 'Am I following my trading plan?', required: true },
            { id: 'in8', text: 'Have I accepted the risk of the trade?', required: true },
            { id: 'in9', text: 'Have I set my stop-loss and target before entry?', required: true },
            { id: 'in10', text: 'Am I free from distractions and fully focused?', required: false },
          ],
        },
      ],
    },
    {
      id: 'swing',
      name: 'Swing Trading Checklist',
      description: 'Checklist for multi-day swing positions.',
      category: 'Swing',
      color: '#8b5cf6',
      createdAt: '2024-10-28',
      lastUsed: ymd(2),
      sections: [
        {
          id: 'sw-setup', title: 'Setup',
          items: [
            { id: 'sw1', text: 'Is the higher-timeframe trend supporting my direction?', required: true },
            { id: 'sw2', text: 'Is the stock/instrument showing relative strength?', required: true },
            { id: 'sw3', text: 'Are the daily support/resistance zones clearly marked?', required: true },
            { id: 'sw4', text: 'Is there a clear entry trigger on my signal candle?', required: true },
            { id: 'sw5', text: 'Is volume confirming the breakout/setup?', required: true },
          ],
        },
        {
          id: 'sw-risk', title: 'Risk',
          items: [
            { id: 'sw6', text: 'Is my risk-reward at least 1:2 to the first target?', required: true },
            { id: 'sw7', text: 'Is my position size within 1–2% account risk?', required: true },
            { id: 'sw8', text: 'Is my stop-loss placed beyond noise/structure?', required: true },
            { id: 'sw9', text: 'Do I have a plan to scale out or trail the stop?', required: false },
          ],
        },
        {
          id: 'sw-mindset', title: 'Mindset',
          items: [
            { id: 'sw10', text: 'Am I comfortable holding this position overnight?', required: true },
            { id: 'sw11', text: 'Am I free from FOMO and revenge-trading urges?', required: true },
            { id: 'sw12', text: 'Have I journaled my thesis for this trade?', required: false },
          ],
        },
      ],
    },
    {
      id: 'positional',
      name: 'Positional Trading Checklist',
      description: 'Checklist for longer-term positional trades.',
      category: 'Positional',
      color: '#f97316',
      createdAt: '2024-10-25',
      lastUsed: ymd(5),
      sections: [
        {
          id: 'po-setup', title: 'Setup',
          items: [
            { id: 'po1', text: 'Does the weekly/monthly trend favor my position?', required: true },
            { id: 'po2', text: 'Do the fundamentals support the thesis?', required: true },
            { id: 'po3', text: 'Is the entry near a major support/demand zone?', required: true },
            { id: 'po4', text: 'Is the sector/market backdrop favorable?', required: true },
            { id: 'po5', text: 'Have I defined my investment horizon?', required: true },
          ],
        },
        {
          id: 'po-mindset', title: 'Risk & Mindset',
          items: [
            { id: 'po6', text: 'Is my position size appropriate for a wider stop?', required: true },
            { id: 'po7', text: 'Is my stop-loss based on structure, not emotion?', required: true },
            { id: 'po8', text: 'Am I prepared to ignore short-term volatility?', required: true },
            { id: 'po9', text: 'Have I documented my exit/review criteria?', required: false },
          ],
        },
      ],
    },
    {
      id: 'options',
      name: 'Options Trading Checklist',
      description: 'Checklist for options strategies and execution.',
      category: 'Options',
      color: '#3b82f6',
      createdAt: '2024-10-20',
      lastUsed: ymd(7),
      sections: [
        {
          id: 'op-setup', title: 'Setup',
          items: [
            { id: 'op1', text: 'Is my directional/volatility view clearly defined?', required: true },
            { id: 'op2', text: 'Have I chosen the right strategy for the view?', required: true },
            { id: 'op3', text: 'Is the strike and expiry aligned with my thesis?', required: true },
            { id: 'op4', text: 'Is the option liquid (tight spread, open interest)?', required: true },
          ],
        },
        {
          id: 'op-risk', title: 'Risk & Greeks',
          items: [
            { id: 'op5', text: 'Is implied volatility favorable for this trade?', required: true },
            { id: 'op6', text: 'Am I comfortable with theta decay over my horizon?', required: true },
            { id: 'op7', text: 'Is my max loss defined and acceptable?', required: true },
            { id: 'op8', text: 'Is my position size within my risk limit?', required: true },
          ],
        },
        {
          id: 'op-mindset', title: 'Mindset',
          items: [
            { id: 'op9', text: 'Do I have a clear profit target and exit plan?', required: true },
            { id: 'op10', text: 'Am I free from emotional bias or FOMO?', required: true },
            { id: 'op11', text: 'Have I checked for events (earnings/expiry) that affect this?', required: false },
          ],
        },
      ],
    },
  ];
}

export function getDefaultRuns(): ChecklistRun[] {
  const mk = (date: string, yes: number): ChecklistRun => ({
    id: `seedrun-${date}`,
    checklistId: 'default-pretrade',
    checklistName: 'Pre-Trade Checklist',
    date,
    yes,
    no: 10 - yes,
    na: 0,
    total: 10,
    percent: Math.round((yes / 10) * 100),
  });
  return [
    mk('2024-11-07', 10),
    mk('2024-11-06', 9),
    mk('2024-11-05', 10),
    mk('2024-11-04', 8),
    mk('2024-11-03', 10),
  ];
}

// Initial answers for the runner so the default Pre-Trade matches the design (all Yes → 100%).
export function getDefaultCurrentRun(): CurrentRun {
  const answers: Record<string, CheckResult> = {};
  ['pt1','pt2','pt3','pt4','pt5','pt6','pt7','pt8','pt9','pt10'].forEach(id => { answers[id] = 'yes'; });
  return { checklistId: 'default-pretrade', answers, notes: {} };
}
