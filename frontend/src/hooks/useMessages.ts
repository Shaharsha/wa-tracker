import { useState, useCallback } from "react";
import { api } from "../api/client";
import type { Message } from "../types";

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async (jid: string) => {
    setLoading(true);
    try {
      const data = await api.getMessages(jid);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, loading, fetchMessages, clear };
}
