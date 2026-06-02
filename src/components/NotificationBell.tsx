import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { storage } from '../utils/storage';
import { getNotifications, type AppNotification } from '../utils/notifications';

// Shared, professional notification dropdown used in every page header.
// Notifications come from app activity (trades + checklist runs); each one links
// to its destination, and read state is persisted per user.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => storage.getReadNotifications());
  const ref = useRef<HTMLDivElement>(null);

  const all = useMemo(() => getNotifications(), []);
  const recent = all.slice(0, 8);
  const unreadCount = all.filter(n => !readIds.includes(n.id)).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function persistRead(ids: string[]) {
    setReadIds(ids);
    storage.saveReadNotifications(ids);
  }

  function markAllRead() {
    persistRead(Array.from(new Set([...readIds, ...all.map(n => n.id)])));
  }

  function openNotif(n: AppNotification) {
    persistRead(Array.from(new Set([...readIds, n.id])));
    setOpen(false);
    navigate(n.link, n.state ? { state: n.state } : undefined);
  }

  return (
    <div className="dropdown-wrap" ref={ref}>
      <div style={{ position: 'relative' }}>
        <button className="header-btn" onClick={() => setOpen(v => !v)} aria-label="Notifications">
          <Bell size={15} />
        </button>
        {unreadCount > 0 && (
          <span className="notif-count-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </div>
      {open && (
        <div className="dropdown-panel notif-dropdown">
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 ? (
              <button className="notif-markread" onClick={markAllRead}>
                <CheckCheck size={13} /> Mark all read
              </button>
            ) : (
              <span className="notif-allread">All caught up</span>
            )}
          </div>
          <div className="notif-list">
            {recent.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              recent.map(n => (
                <div key={n.id} className={`notif-item ${readIds.includes(n.id) ? '' : 'unread'}`} onClick={() => openNotif(n)}>
                  <div className={`notif-dot-indicator ${n.dot}`} />
                  <div className="notif-content">
                    <div className="notif-trade-title">{n.title}</div>
                    <div className={`notif-trade-value ${n.valueClass}`}>{n.value}</div>
                  </div>
                  <div className="notif-trade-date">
                    {new Date(n.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="notif-seeall" onClick={() => { setOpen(false); navigate('/notifications'); }}>
            See all notifications <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
