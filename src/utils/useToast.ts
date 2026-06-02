import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Lightweight toast hook — renders `{toast && <div className="app-toast">{toast}</div>}`.
 * Replaces native alert() with a consistent, professional notification.
 */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return { toast, showToast };
}
