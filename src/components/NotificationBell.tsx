import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { storage } from '../utils/storage';
import { calcPnL, formatCurrency, pnlColorClass } from '../utils/calculations';

// Shared, professional notification dropdown used in every page header.
// Notifications are derived from recent trades; read state is persisted per user.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => storage.getReadNotifications());
  const ref = useRef<HTMLDivElement>(null);

  const recent = useMemo(() => storage.getTrades().slice(0, 8), []);
  const unreadCount = recent.filter(t => !readIds.includes(t.id)).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function markAllRead() {
    const ids = Array.from(new Set([...readIds, ...recent.map(t => t.id)]));
    setReadIds(ids);
    storage.saveReadNotifications(ids);
  }

  function goToAll() {
    setOpen(false);
    navigate('/all-trades');
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
              recent.map(trade => {
                const pnl = calcPnL(trade);
                const isUnread = !readIds.includes(trade.id);
                return (
                  <div key={trade.id} className={`notif-item ${isUnread ? 'unread' : ''}`} onClick={goToAll}>
                    <div className={`notif-dot-indicator ${pnl >= 0 ? 'green' : 'red'}`} />
                    <div className="notif-content">
                      <div className="notif-trade-title">{trade.instrument || 'Trade'} · {trade.direction}</div>
                      <div className={`notif-trade-value ${pnlColorClass(pnl)}`}>{formatCurrency(pnl)}</div>
                    </div>
                    <div className="notif-trade-date">
                      {new Date(trade.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button className="notif-seeall" onClick={goToAll}>
            See all notifications <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
