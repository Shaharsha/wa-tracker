import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { Contact } from "../types";

export function useContacts(refreshInterval = 60_000) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dismissed, setDismissed] = useState<Contact[]>([]);
  const [blocked, setBlocked] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [unanswered, dismissedList, blockedList] = await Promise.all([
        api.getUnanswered(),
        api.getDismissed(),
        api.getBlocked(),
      ]);
      setContacts(unanswered);
      setDismissed(dismissedList);
      setBlocked(blockedList);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  return { contacts, dismissed, blocked, loading, error, refresh };
}
