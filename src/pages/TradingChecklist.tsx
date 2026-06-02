import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, ChevronDown, ChevronRight, Plus, Play, Edit3, MoreHorizontal,
  ClipboardCheck, ClipboardList, RotateCcw, Save, Lightbulb, Download, Printer, Copy,
  BarChart3, LayoutDashboard, Settings, Trash2, FileText
} from 'lucide-react';
import type { ChecklistTemplate, ChecklistRun, CheckResult } from '../types/checklist';
import { allItems, countPoints } from '../types/checklist';
import { storage } from '../utils/storage';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import NotificationBell from '../components/NotificationBell';
import { useToast } from '../utils/useToast';

function fmtDate(d: string): string {
  return new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Donut({ percent, color }: { percent: number; color: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <div className="tc-donut">
      <svg viewBox="0 0 100 100">
        <circle className="tc-donut-bg" cx="50" cy="50" r={r} />
        <circle className="tc-donut-fg" cx="50" cy="50" r={r} stroke={color}
          strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="tc-donut-center">
        <div className="tc-donut-pct">{percent}%</div>
        <div className="tc-donut-sub">Completed</div>
      </div>
    </div>
  );
}

export default function TradingChecklist() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [activeId, setActiveId] = useState<string>('default-pretrade');
  const [answers, setAnswers] = useState<Record<string, CheckResult>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cls = storage.getChecklists();
    const rns = storage.getChecklistRuns();
    const cur = storage.getCurrentRun();
    setChecklists(cls);
    setRuns(rns);
    setActiveId(cls.some(c => c.id === cur.checklistId) ? cur.checklistId : (cls[0]?.id || 'default-pretrade'));
    setAnswers(cur.answers || {});
    setNotes(cur.notes || {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active = useMemo(() => checklists.find(c => c.id === activeId) || checklists[0], [checklists, activeId]);
  const items = useMemo(() => (active ? allItems(active) : []), [active]);

  // Persist the in-progress run whenever answers/notes/active change.
  function persist(nextAnswers: Record<string, CheckResult>, nextNotes: Record<string, string>, id = activeId) {
    storage.saveCurrentRun({ checklistId: id, answers: nextAnswers, notes: nextNotes });
  }

  function setAnswer(itemId: string, result: CheckResult) {
    setAnswers(prev => {
      const next = { ...prev, [itemId]: prev[itemId] === result ? '' : result };
      persist(next, notes);
      return next;
    });
  }

  function setNote(itemId: string, val: string) {
    setNotes(prev => {
      const next = { ...prev, [itemId]: val };
      persist(answers, next);
      return next;
    });
  }

  function resetChecklist() {
    setAnswers({});
    setNotes({});
    persist({}, {});
  }

  // Record the current checklist completion into history (Recent Checklists / All-Time / History page).
  function saveToHistory() {
    if (!active) return;
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const run: ChecklistRun = {
      id: storage.generateId(),
      checklistId: active.id,
      checklistName: active.id === 'default-pretrade' ? 'Pre-Trade Checklist' : active.name,
      date: ds,
      yes: summary.yes, no: summary.no, na: summary.na, total: summary.total, percent: summary.percent,
    };
    const updated = [run, ...runs];
    setRuns(updated);
    storage.saveChecklistRuns(updated);
    showToast(`Saved to history — ${summary.percent}% completed`);
  }

  function runChecklist(id: string) {
    setActiveId(id);
    setAnswers({});
    setNotes({});
    persist({}, {}, id);
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setChecklists(prev => {
      const next = prev.map(c => c.id === id ? { ...c, lastUsed: ds } : c);
      storage.saveChecklists(next);
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Live summary for the active checklist
  const summary = useMemo(() => {
    const total = items.length;
    let yes = 0, no = 0, na = 0;
    items.forEach(it => {
      const a = answers[it.id];
      if (a === 'yes') yes++; else if (a === 'no') no++; else if (a === 'na') na++;
    });
    return { yes, no, na, total, percent: total ? Math.round((yes / total) * 100) : 0 };
  }, [items, answers]);

  // All-time summary across recorded runs
  const allTime = useMemo(() => {
    const tot = runs.reduce((s, r) => s + r.total, 0);
    const yes = runs.reduce((s, r) => s + r.yes, 0);
    const no = runs.reduce((s, r) => s + r.no, 0);
    const na = runs.reduce((s, r) => s + r.na, 0);
    return { yes, no, na, total: tot, percent: tot ? Math.round((yes / tot) * 100) : 0 };
  }, [runs]);

  const recent = useMemo(() => [...runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [runs]);
  const myChecklists = useMemo(() => checklists.filter(c => c.id !== 'default-pretrade'), [checklists]);

  function duplicate(id: string) {
    const src = checklists.find(c => c.id === id);
    if (!src) return;
    const copy: ChecklistTemplate = {
      ...src,
      id: storage.generateId(),
      name: `${src.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: new Date().toISOString().split('T')[0],
      sections: src.sections.map(s => ({
        ...s, id: storage.generateId(),
        items: s.items.map(it => ({ ...it, id: storage.generateId() })),
      })),
    };
    const updated = [...checklists, copy];
    setChecklists(updated);
    storage.saveChecklists(updated);
    navigate('/trading-checklist/manage', { state: { selectedId: copy.id } });
  }

  function deleteChecklist(id: string) {
    setRowMenu(null);
    setConfirmDel(id);
  }

  function confirmDelete() {
    const id = confirmDel;
    if (!id) return;
    const updated = checklists.filter(c => c.id !== id);
    setChecklists(updated);
    storage.saveChecklists(updated);
    setConfirmDel(null);
  }

  function printView() {
    window.print();
  }

  if (!active) return null;

  let itemNo = 0;

  return (
    <>
      {/* ===== PAGE HEADER ===== */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Trading Checklist</h2>
          <p>Use this checklist before entering any trade to stay disciplined and consistent.</p>
        </div>
        <div className="page-header-right">
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            onClick={() => navigate('/trading-checklist/manage', { state: { create: true } })}>
            <Plus size={15} /> Create New Checklist
          </button>
          <button className="header-btn" onClick={() => { const next = toggleTheme(); setIsDark(next === 'dark'); }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <NotificationBell />

          {/* Profile */}
          <div className="dropdown-wrap" ref={profileRef}>
            <div className="user-profile-badge" onClick={() => setShowProfile(v => !v)}>
              <div className="user-avatar">{userInitials}</div>
              <div className="user-profile-info">
                <span className="user-profile-name">{userName}</span>
                <span className="user-profile-plan">Pro Plan</span>
              </div>
              <ChevronDown size={14} color="var(--text-secondary)" />
            </div>
            {showProfile && (
              <div className="dropdown-panel profile-dropdown">
                <div className="dropdown-user-header">
                  <div className="user-avatar" style={{ width: 38, height: 38, flexShrink: 0 }}>{userInitials}</div>
                  <div>
                    <div className="dropdown-user-name">{userName}</div>
                    <div className="dropdown-user-plan">Pro Plan · Active</div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/'); }}>
                  <LayoutDashboard size={14} /> Dashboard
                </button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}>
                  <Settings size={14} /> Settings
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { logout(); }} style={{ color: 'var(--red-500)' }}>
                  <FileText size={14} /> Sign Out
                </button>
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="tc-layout">
          {/* ===== MAIN COLUMN ===== */}
          <div className="tc-main">
            {/* Pre-Trade Checklist card */}
            <div className="card animate-in">
              <div className="tc-card-head">
                <div className="tc-card-head-left">
                  <div className="tc-card-icon"><ClipboardCheck size={20} /></div>
                  <div>
                    <h3>{active.id === 'default-pretrade' ? 'Pre-Trade Checklist' : active.name}</h3>
                    <p>{active.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={saveToHistory}>
                    <Save size={14} /> Save to History
                  </button>
                  <button className="btn-outline-green tc-reset-btn" onClick={resetChecklist}>
                    <RotateCcw size={14} /> Reset Checklist
                  </button>
                </div>
              </div>

              <div className="card-body-np">
                <table className="data-table tc-table">
                  <thead>
                    <tr>
                      <th>Check Point</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Yes</th>
                      <th style={{ width: 60, textAlign: 'center' }}>No</th>
                      <th style={{ width: 60, textAlign: 'center' }}>N/A</th>
                      <th style={{ width: 260 }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.sections.map(section => (
                      section.items.map(item => {
                        itemNo++;
                        const a = answers[item.id] || '';
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="tc-checkpoint">
                                <span className="tc-num">{itemNo}</span>
                                <div>
                                  <div className="tc-q">{item.text}</div>
                                  {item.subtext && <div className="tc-sub">{item.subtext}</div>}
                                </div>
                              </div>
                            </td>
                            {(['yes', 'no', 'na'] as CheckResult[]).map(opt => (
                              <td key={opt} style={{ textAlign: 'center' }}>
                                <label className={`tc-check ${opt} ${a === opt ? 'checked' : ''}`}>
                                  <input type="checkbox" checked={a === opt} onChange={() => setAnswer(item.id, opt)} />
                                  <span className="tc-check-box" />
                                </label>
                              </td>
                            ))}
                            <td>
                              <input className="tc-note-input" type="text" placeholder="Add notes (optional)"
                                value={notes[item.id] || ''} onChange={e => setNote(item.id, e.target.value)} />
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tc-protip">
                <Lightbulb size={15} />
                <span><strong>Pro Tip:</strong> Take 2 minutes to go through this checklist. It can save you from costly mistakes and keep you consistent.</span>
              </div>
            </div>

            {/* My Checklists */}
            <div className="card animate-in" style={{ marginTop: 20 }}>
              <div className="tc-mychecklists-head">
                <div>
                  <h3>My Checklists</h3>
                  <p>Create and manage your own trading checklists.</p>
                </div>
                <button className="btn-outline-green" onClick={() => navigate('/trading-checklist/manage', { state: { create: true } })}>
                  <Plus size={14} /> Create New Checklist
                </button>
              </div>

              <div className="tc-mychecklists-body">
                <div className="card-body-np" style={{ flex: 1 }}>
                  {myChecklists.length === 0 ? (
                    <div className="tc-empty">No checklists yet. Create your first one.</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Checklist Name</th>
                          <th>Points</th>
                          <th>Created On</th>
                          <th>Last Used</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myChecklists.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div className="tc-cl-name">
                                <span className="tc-cl-icon" style={{ color: c.color }}><ClipboardList size={15} /></span>
                                <span style={{ fontWeight: 600 }}>{c.name.replace(' Trading', '')}</span>
                              </div>
                            </td>
                            <td><span className="tc-points">{countPoints(c)} Points</span></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(c.createdAt)}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(c.lastUsed)}</td>
                            <td>
                              <div className="tc-row-actions">
                                <button className="tc-row-btn" title="Run" onClick={() => runChecklist(c.id)}><Play size={14} /></button>
                                <button className="tc-row-btn" title="Edit" onClick={() => navigate('/trading-checklist/manage', { state: { selectedId: c.id } })}><Edit3 size={14} /></button>
                                <div style={{ position: 'relative' }}>
                                  <button className="tc-row-btn" title="More" onClick={() => setRowMenu(rowMenu === c.id ? null : c.id)}><MoreHorizontal size={14} /></button>
                                  {rowMenu === c.id && (
                                    <div className="ebs-popup-menu">
                                      <button className="ebs-popup-item" onClick={() => { setRowMenu(null); duplicate(c.id); }}><Copy size={14} /> Duplicate</button>
                                      <button className="ebs-popup-item danger" onClick={() => { setRowMenu(null); deleteChecklist(c.id); }}><Trash2 size={14} /> Delete</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="tc-viewall">
                    <button className="view-all-link" onClick={() => navigate('/trading-checklist/manage')}>
                      View All My Checklists <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Create Your Own card */}
                <div className="tc-create-card" onClick={() => navigate('/trading-checklist/manage', { state: { create: true } })}>
                  <div className="tc-create-icon"><ClipboardCheck size={26} /></div>
                  <strong>Create Your Own Checklist</strong>
                  <span>Build a personalized checklist that matches your strategy and trading style.</span>
                  <button className="btn-primary" style={{ marginTop: 6 }}>
                    <Plus size={15} /> Create New Checklist
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT SIDEBAR ===== */}
          <div className="tc-side">
            {/* Checklist Summary (current) */}
            <div className="card animate-in tc-summary-card">
              <div className="tc-summary-head"><BarChart3 size={16} color="var(--green-600)" /> Checklist Summary</div>
              <div className="tc-summary-body">
                <Donut percent={summary.percent} color="var(--green-500)" />
                <div className="tc-legend">
                  <div className="tc-legend-row"><span className="dot green" /> Yes <strong>{summary.yes}</strong></div>
                  <div className="tc-legend-row"><span className="dot red" /> No <strong>{summary.no}</strong></div>
                  <div className="tc-legend-row"><span className="dot purple" /> N/A <strong>{summary.na}</strong></div>
                  <div className="tc-legend-row total">Total <strong>{summary.total}</strong></div>
                </div>
              </div>
            </div>

            {/* Checklist Summary (All Time) */}
            <div className="card animate-in tc-summary-card">
              <div className="tc-summary-head"><BarChart3 size={16} color="var(--green-600)" /> Checklist Summary (All Time)</div>
              <div className="tc-summary-body">
                <Donut percent={allTime.percent} color="var(--green-500)" />
                <div className="tc-legend">
                  <div className="tc-legend-row"><span className="dot green" /> Yes <strong>{allTime.yes}</strong></div>
                  <div className="tc-legend-row"><span className="dot red" /> No <strong>{allTime.no}</strong></div>
                  <div className="tc-legend-row"><span className="dot purple" /> N/A <strong>{allTime.na}</strong></div>
                  <div className="tc-legend-row total">Total <strong>{allTime.total}</strong></div>
                </div>
              </div>
            </div>

            {/* Recent Checklists */}
            <div className="card animate-in">
              <div className="tc-side-title">Recent Checklists</div>
              {recent.length === 0 ? (
                <div className="tc-empty">No checklist history yet.</div>
              ) : (
                <div className="tc-recent-list">
                  {recent.map(r => (
                    <div key={r.id} className="tc-recent-row">
                      <span className="tc-recent-date">{fmtDate(r.date)}</span>
                      <span className="tc-recent-score">{r.yes} / {r.total}</span>
                      <span className={`tc-recent-pct ${r.percent >= 90 ? 'good' : 'bad'}`}>{r.percent}%</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="tc-viewall center">
                <button className="view-all-link" onClick={() => navigate('/trading-checklist/history')}>
                  View All History <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card animate-in">
              <div className="tc-side-title">Quick Actions</div>
              <button className="tc-action" onClick={printView}>
                <span className="tc-action-ico"><Download size={16} /></span>
                <span className="tc-action-text"><strong>Download Checklist</strong><span>PDF format</span></span>
                <ChevronRight size={15} />
              </button>
              <button className="tc-action" onClick={printView}>
                <span className="tc-action-ico"><Printer size={16} /></span>
                <span className="tc-action-text"><strong>Print Checklist</strong><span>Printable version</span></span>
                <ChevronRight size={15} />
              </button>
              <button className="tc-action" onClick={() => duplicate(active.id)}>
                <span className="tc-action-ico"><Copy size={16} /></span>
                <span className="tc-action-text"><strong>Duplicate Template</strong><span>Create a copy</span></span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PRINTABLE VIEW (hidden on screen, shown on print/PDF) ===== */}
      <div className="tc-print-area">
        <h1>{active.id === 'default-pretrade' ? 'Pre-Trade Checklist' : active.name}</h1>
        <p>{active.description}</p>
        {active.sections.map(section => (
          <div key={section.id} className="tc-print-section">
            {active.sections.length > 1 && <h2>{section.title}</h2>}
            <table>
              <thead><tr><th>Check Point</th><th>Yes</th><th>No</th><th>N/A</th><th>Notes</th></tr></thead>
              <tbody>
                {section.items.map(it => {
                  const a = answers[it.id] || '';
                  return (
                    <tr key={it.id}>
                      <td>{it.text}{it.subtext ? ` — ${it.subtext}` : ''}</td>
                      <td style={{ textAlign: 'center' }}>{a === 'yes' ? '✓' : ''}</td>
                      <td style={{ textAlign: 'center' }}>{a === 'no' ? '✓' : ''}</td>
                      <td style={{ textAlign: 'center' }}>{a === 'na' ? '✓' : ''}</td>
                      <td>{notes[it.id] || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmDel}
        danger
        title="Delete checklist?"
        message="This checklist and all of its checkpoints will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDel(null)}
      />
      {toast && <div className="app-toast">{toast}</div>}
    </>
  );
}
