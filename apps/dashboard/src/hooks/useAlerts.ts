import { useState, useEffect, useCallback } from "react";
import { alertsApi } from "@/lib/api";

const POLL_MS = 30_000; // poll every 30 seconds

export function useAlerts() {
  const [alerts, setAlerts]   = useState<any[]>([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await alertsApi.list(20);
      setAlerts(res.data || []);
      setUnread(res.unread ?? 0);
    } catch {
      // silently ignore — bell is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  const markRead = async (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    setUnread(prev => Math.max(0, prev - 1));
    await alertsApi.markRead(id).catch(() => {});
  };

  const readAll = async () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    setUnread(0);
    await alertsApi.readAll().catch(() => {});
  };

  return { alerts, unread, loading, refetch: fetch, markRead, readAll };
}
