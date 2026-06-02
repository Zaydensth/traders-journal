import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sun, Moon, ChevronDown, ChevronRight, CheckCheck, Bell,
  TrendingUp, ClipboardCheck, LayoutDashboard, Settings, FileText
} from 'lucide-react';
import { storage } from '../utils/storage';
import { getNotifications, type AppNotification } from '../utils/notifications';
import { toggleTheme, getTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';

function fmtDate(d: string): string {
  return new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Trader';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const [readIds, setReadIds] = useState<string[]>(() => storage.getReadNotifications());
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifs = useMemo(() => getNotifications(), []);
  const unreadCount = notifs.filter(n => !readIds.includes(n.id)).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function persistRead(ids: string[]) {
    setReadIds(ids);
    storage.saveReadNotifications(ids);
  }

  function markAllRead() {
    persistRead(Array.from(new Set([...readIds, ...notifs.map(n => n.id)])));
  }

  function openNotif(n: AppNotification) {
    persistRead(Array.from(new Set([...readIds, n.id])));
    navigate(n.link, n.state ? { state: n.state } : undefined);
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <button className="page-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
          <h2>Notifications</h2>
          <p>Your recent activity — click any item to jump straight to it.</p>
        </div>
        <div className="page-header-right">
          <button className="header-btn" onClick={() => { const next = toggleTheme(); setIsDark(next === 'dark'); }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <NotificationBell />
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
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">
              <Bell size={18} color="var(--green-600)" /> All Notifications
              {unreadCount > 0 && <span className="notif-badge" style={{ marginLeft: 8 }}>{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button className="notif-markread" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>
            )}
          </div>
          <div className="card-body-np">
            {notifs.length === 0 ? (
              <div className="tc-empty">No notifications yet. Log a trade or complete a checklist to see activity here.</div>
            ) : (
              <div className="notif-page-list">
                {notifs.map(n => (
                  <button key={n.id} className={`notif-page-item ${readIds.includes(n.id) ? '' : 'unread'}`} onClick={() => openNotif(n)}>
                    <span className={`notif-page-icon ${n.kind}`}>
                      {n.kind === 'trade' ? <TrendingUp size={16} /> : <ClipboardCheck size={16} />}
                    </span>
                    <div className="notif-page-content">
                      <div className="notif-page-title">{n.title}</div>
                      <div className={`notif-page-value ${n.valueClass}`}>{n.value}</div>
                    </div>
                    <span className="notif-page-date">{fmtDate(n.date)}</span>
                    <ChevronRight size={16} className="notif-page-arrow" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
