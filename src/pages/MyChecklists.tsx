import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sun, Moon, Bell, ChevronDown, Plus, Search, Filter, Pencil, Trash2,
  Edit3, GripVertical, Share2, MoreHorizontal, ClipboardList, Copy,
  LayoutDashboard, Settings, FileText
} from 'lucide-react';
import type { ChecklistTemplate, ChecklistSection, ChecklistItemDef } from '../types/checklist';
import { CHECKLIST_CATEGORIES, countPoints } from '../types/checklist';
import { storage } from '../utils/storage';
import { calcPnL, formatCurrency, pnlColorClass } from '../utils/calculations';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

const SETUP_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function relUsed(d: string): string {
  const then = new Date(d + 'T00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const days = Math.round((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MyChecklists() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [headMenu, setHeadMenu] = useState(false);

  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [bellRead, setBellRead] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sectionId: string; itemId: string } | null>(null);

  const notifTrades = useMemo(() => storage.getTrades().slice(0, 5), []);

  useEffect(() => {
    const cls = storage.getChecklists();
    setChecklists(cls);
    const st = location.state as { create?: boolean; selectedId?: string } | null;
    if (st?.create) {
      createNew(cls);
    } else if (st?.selectedId && cls.some(c => c.id === st.selectedId)) {
      setSelectedId(st.selectedId);
    } else {
      setSelectedId(cls.find(c => c.id !== 'default-pretrade')?.id || cls[0]?.id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = useMemo(() => checklists.find(c => c.id === selectedId) || null, [checklists, selectedId]);
  const filtered = useMemo(
    () => checklists.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [checklists, search]
  );

  function persist(list: ChecklistTemplate[]) {
    storage.saveChecklists(list);
  }

  function createNew(base?: ChecklistTemplate[]) {
    const list = base || checklists;
    const t: ChecklistTemplate = {
      id: storage.generateId(),
      name: 'New Checklist',
      description: '',
      category: 'General',
      color: SETUP_COLORS[list.length % SETUP_COLORS.length],
      createdAt: today(),
      lastUsed: today(),
      sections: [{
        id: storage.generateId(), title: 'Section 1',
        items: [{ id: storage.generateId(), text: 'New checkpoint', required: true }],
      }],
    };
    const updated = [...list, t];
    setChecklists(updated);
    persist(updated);
    setSelectedId(t.id);
  }

  function updateSelected(fn: (t: ChecklistTemplate) => ChecklistTemplate) {
    setChecklists(prev => {
      const next = prev.map(c => (c.id === selectedId ? fn(c) : c));
      persist(next);
      return next;
    });
  }

  function deleteChecklist(id: string) {
    if (!window.confirm('Delete this checklist? This cannot be undone.')) return;
    setChecklists(prev => {
      const next = prev.filter(c => c.id !== id);
      persist(next);
      if (id === selectedId) setSelectedId(next.find(c => c.id !== 'default-pretrade')?.id || next[0]?.id || '');
      return next;
    });
  }

  function duplicate(id: string) {
    const src = checklists.find(c => c.id === id);
    if (!src) return;
    const copy: ChecklistTemplate = {
      ...src, id: storage.generateId(), name: `${src.name} (Copy)`,
      createdAt: today(), lastUsed: today(),
      sections: src.sections.map(s => ({
        ...s, id: storage.generateId(),
        items: s.items.map(it => ({ ...it, id: storage.generateId() })),
      })),
    };
    const updated = [...checklists, copy];
    setChecklists(updated);
    persist(updated);
    setSelectedId(copy.id);
  }

  /* ─── item / section operations ─── */
  function updateItem(sectionId: string, itemId: string, patch: Partial<ChecklistItemDef>) {
    updateSelected(t => ({
      ...t,
      sections: t.sections.map(s => s.id !== sectionId ? s : {
        ...s, items: s.items.map(it => it.id === itemId ? { ...it, ...patch } : it),
      }),
    }));
  }
  function deleteItem(sectionId: string, itemId: string) {
    updateSelected(t => ({
      ...t,
      sections: t.sections.map(s => s.id !== sectionId ? s : { ...s, items: s.items.filter(it => it.id !== itemId) }),
    }));
  }
  function addItem(sectionId: string) {
    updateSelected(t => ({
      ...t,
      sections: t.sections.map(s => s.id !== sectionId ? s : {
        ...s, items: [...s.items, { id: storage.generateId(), text: 'New checkpoint', required: true }],
      }),
    }));
  }
  function updateSectionTitle(sectionId: string, title: string) {
    updateSelected(t => ({ ...t, sections: t.sections.map(s => s.id === sectionId ? { ...s, title } : s) }));
  }
  function deleteSection(sectionId: string) {
    updateSelected(t => ({ ...t, sections: t.sections.filter(s => s.id !== sectionId) }));
  }
  function addSection() {
    updateSelected(t => ({
      ...t,
      sections: [...t.sections, { id: storage.generateId(), title: `Section ${t.sections.length + 1}`, items: [] }],
    }));
  }

  /* ─── drag & drop reorder (within and across sections) ─── */
  function onDrop(targetSectionId: string, targetItemId: string | null) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.sectionId === targetSectionId && d.itemId === targetItemId) return;
    updateSelected(t => {
      let dragged: ChecklistItemDef | null = null;
      const stripped: ChecklistSection[] = t.sections.map(s => {
        if (s.id !== d.sectionId) return s;
        const found = s.items.find(it => it.id === d.itemId) || null;
        if (found) dragged = found;
        return { ...s, items: s.items.filter(it => it.id !== d.itemId) };
      });
      if (!dragged) return t;
      const sections = stripped.map(s => {
        if (s.id !== targetSectionId) return s;
        const items = [...s.items];
        if (targetItemId === null) {
          items.push(dragged!);
        } else {
          const idx = items.findIndex(it => it.id === targetItemId);
          items.splice(idx === -1 ? items.length : idx, 0, dragged!);
        }
        return { ...s, items };
      });
      return { ...t, sections };
    });
  }

  let itemNo = 0;

  return (
    <>
      {/* ===== PAGE HEADER ===== */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>My Checklists</h2>
          <p>Create, customize and manage your trading checklists.</p>
        </div>
        <div className="page-header-right">
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={() => createNew()}>
            <Plus size={15} /> Create New Checklist
          </button>
          <button className="header-btn" onClick={() => { const next = toggleTheme(); setIsDark(next === 'dark'); }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="dropdown-wrap" ref={bellRef}>
            <div style={{ position: 'relative' }}>
              <button className="header-btn" onClick={() => { setShowBell(v => !v); setBellRead(true); setShowProfile(false); }}>
                <Bell size={15} />
              </button>
              {!bellRead && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, background: 'var(--red-500)', borderRadius: '50%', border: '1.5px solid var(--bg-card)', pointerEvents: 'none' }} />}
            </div>
            {showBell && (
              <div className="dropdown-panel notif-dropdown">
                <div className="notif-panel-header"><span>Recent Trades</span><span className="notif-badge">{notifTrades.length}</span></div>
                {notifTrades.map(trade => {
                  const pnl = calcPnL(trade);
                  return (
                    <div key={trade.id} className="notif-item">
                      <div className={`notif-dot-indicator ${pnl >= 0 ? 'green' : 'red'}`} />
                      <div className="notif-content">
                        <div className="notif-trade-title">{trade.instrument} · {trade.direction}</div>
                        <div className={`notif-trade-value ${pnlColorClass(pnl)}`}>{formatCurrency(pnl)}</div>
                      </div>
                      <div className="notif-trade-date">{new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  );
                })}
                {notifTrades.length === 0 && <div className="notif-empty">No trades yet</div>}
              </div>
            )}
          </div>
          <div className="dropdown-wrap" ref={profileRef}>
            <div className="user-profile-badge" onClick={() => { setShowProfile(v => !v); setShowBell(false); }}>
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
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/'); }}><LayoutDashboard size={14} /> Dashboard</button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/settings'); }}><Settings size={14} /> Settings</button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { logout(); }} style={{ color: 'var(--red-500)' }}><FileText size={14} /> Sign Out</button>
                <div className="dropdown-footer">v1.0 · Trader's Journal</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="mc-layout">
          {/* ===== LEFT: list ===== */}
          <div className="mc-list-col">
            <div className="mc-search-row">
              <div className="input-with-icon" style={{ flex: 1 }}>
                <Search size={14} className="input-icon" />
                <input type="text" placeholder="Search checklists..." value={search}
                  onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
              <button className="mc-filter-btn" title="Filter"><Filter size={15} /></button>
            </div>

            <div className="mc-list">
              {filtered.map(c => (
                <div key={c.id} className={`mc-list-item ${selectedId === c.id ? 'active' : ''}`} onClick={() => setSelectedId(c.id)}>
                  <span className="mc-list-icon" style={{ color: c.color }}><ClipboardList size={18} /></span>
                  <div className="mc-list-info">
                    <div className="mc-list-name">{c.name}</div>
                    <div className="mc-list-meta">{countPoints(c)} Points · Last used {relUsed(c.lastUsed)}</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button className="tc-row-btn" onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === c.id ? null : c.id); }}><MoreHorizontal size={15} /></button>
                    {rowMenu === c.id && (
                      <div className="ebs-popup-menu" onClick={e => e.stopPropagation()}>
                        <button className="ebs-popup-item" onClick={() => { setRowMenu(null); duplicate(c.id); }}><Copy size={14} /> Duplicate</button>
                        <button className="ebs-popup-item danger" onClick={() => { setRowMenu(null); deleteChecklist(c.id); }}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button className="mc-create-btn" onClick={() => createNew()}><Plus size={15} /> Create New Checklist</button>
            </div>
          </div>

          {/* ===== MIDDLE: editor ===== */}
          {selected ? (
            <div className="mc-editor-col">
              <div className="card animate-in">
                <div className="mc-editor-head">
                  <div>
                    <div className="mc-editor-title">
                      {selected.name} <Pencil size={15} className="mc-title-pencil" />
                    </div>
                    <div className="mc-editor-points">{countPoints(selected)} Points</div>
                  </div>
                  <div className="mc-editor-actions">
                    <button className="btn-outline-green mc-share-btn" onClick={() => {
                      const text = `${selected.name}\n\n` + selected.sections.map(s =>
                        `${s.title}\n` + s.items.map((it, i) => `  ${i + 1}. ${it.text}`).join('\n')).join('\n\n');
                      navigator.clipboard?.writeText(text);
                      alert('Checklist copied to clipboard — ready to share.');
                    }}><Share2 size={14} /> Share</button>
                    <div style={{ position: 'relative' }}>
                      <button className="tc-row-btn" onClick={() => setHeadMenu(v => !v)}><MoreHorizontal size={16} /></button>
                      {headMenu && (
                        <div className="ebs-popup-menu" onClick={() => setHeadMenu(false)}>
                          <button className="ebs-popup-item" onClick={() => duplicate(selected.id)}><Copy size={14} /> Duplicate</button>
                          <button className="ebs-popup-item danger" onClick={() => deleteChecklist(selected.id)}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mc-sections">
                  {selected.sections.map(section => (
                    <div key={section.id} className="mc-section"
                      onDragOver={e => e.preventDefault()} onDrop={() => onDrop(section.id, null)}>
                      <div className="mc-section-head">
                        <input className="mc-section-title" value={section.title}
                          onChange={e => updateSectionTitle(section.id, e.target.value)} />
                        <button className="mc-section-del" title="Delete section" onClick={() => deleteSection(section.id)}><Trash2 size={13} /></button>
                      </div>

                      {section.items.map(item => {
                        itemNo++;
                        return (
                          <div key={item.id} className="mc-item" draggable
                            onDragStart={() => { dragRef.current = { sectionId: section.id, itemId: item.id }; }}
                            onDragOver={e => { e.preventDefault(); }}
                            onDrop={e => { e.stopPropagation(); onDrop(section.id, item.id); }}>
                            <span className="mc-grip"><GripVertical size={15} /></span>
                            <span className="mc-item-num">{itemNo}</span>
                            {editingItemId === item.id ? (
                              <input className="mc-item-edit" autoFocus value={item.text}
                                onChange={e => updateItem(section.id, item.id, { text: e.target.value })}
                                onBlur={() => setEditingItemId(null)}
                                onKeyDown={e => { if (e.key === 'Enter') setEditingItemId(null); }} />
                            ) : (
                              <span className="mc-item-text">{item.text}</span>
                            )}
                            <div className="select-wrapper mc-req-select">
                              <select value={item.required ? 'Required' : 'Optional'}
                                onChange={e => updateItem(section.id, item.id, { required: e.target.value === 'Required' })}>
                                <option>Required</option>
                                <option>Optional</option>
                              </select>
                              <ChevronDown size={12} className="select-icon" />
                            </div>
                            <button className="mc-item-btn" title="Edit" onClick={() => setEditingItemId(item.id)}><Edit3 size={14} /></button>
                            <button className="mc-item-btn danger" title="Delete" onClick={() => deleteItem(section.id, item.id)}><Trash2 size={14} /></button>
                          </div>
                        );
                      })}

                      <button className="mc-add-item" onClick={() => addItem(section.id)}><Plus size={13} /> Add checkpoint</button>
                    </div>
                  ))}

                  <button className="mc-add-section" onClick={addSection}><Plus size={16} /> Add Section</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mc-editor-col">
              <div className="card animate-in" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                <h3 style={{ marginBottom: 6 }}>No checklist selected</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 18 }}>Pick a checklist on the left or create a new one.</p>
                <button className="btn-primary" onClick={() => createNew()} style={{ margin: '0 auto' }}><Plus size={15} /> Create New Checklist</button>
              </div>
            </div>
          )}

          {/* ===== RIGHT: settings ===== */}
          {selected && (
            <div className="mc-settings-col">
              <div className="card animate-in">
                <div className="mc-settings-title">Checklist Settings</div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Checklist Name</label>
                  <input type="text" value={selected.name} onChange={e => updateSelected(t => ({ ...t, name: e.target.value }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                  <textarea rows={3} value={selected.description} onChange={e => updateSelected(t => ({ ...t, description: e.target.value }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Category</label>
                  <div className="select-wrapper">
                    <select value={selected.category} onChange={e => updateSelected(t => ({ ...t, category: e.target.value }))}>
                      {CHECKLIST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-icon" />
                  </div>
                </div>

                <button className="mc-delete-checklist" onClick={() => deleteChecklist(selected.id)}>
                  <Trash2 size={15} /> Delete Checklist
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
