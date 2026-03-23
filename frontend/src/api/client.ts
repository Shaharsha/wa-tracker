const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("wa_tracker_token");
}

export function setToken(token: string) {
  localStorage.setItem("wa_tracker_token", token);
}

export function clearToken() {
  localStorage.removeItem("wa_tracker_token");
}

export function hasToken(): boolean {
  return !!getToken();
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (resp.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error("Unauthorized");
  }

  if (!resp.ok) {
    throw new Error(`API error: ${resp.status}`);
  }

  return resp.json();
}

export interface WAHASession {
  status: string;
  qr?: {
    mimetype: string;
    data: string;
  } | null;
}

export const api = {
  login: async (username: string, password: string): Promise<string> => {
    const resp = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (resp.status === 429) throw new Error("Too many attempts. Try again in 5 minutes.");
    if (!resp.ok) throw new Error("Invalid credentials");
    const data = await resp.json();
    return data.token;
  },

  getUnanswered: (includeDismissed = false) =>
    apiFetch<import("../types").Contact[]>(
      `/contacts/unanswered?include_dismissed=${includeDismissed}`
    ),

  getDismissed: () =>
    apiFetch<import("../types").Contact[]>("/contacts/dismissed"),

  getBlocked: () =>
    apiFetch<import("../types").Contact[]>("/contacts/blocked"),

  getMessages: (jid: string, limit = 50) =>
    apiFetch<import("../types").Message[]>(
      `/contacts/${encodeURIComponent(jid)}/messages?limit=${limit}`
    ),

  sendMessage: (jid: string, text: string) =>
    apiFetch<{ status: string; id: string }>(
      `/contacts/${encodeURIComponent(jid)}/send`,
      { method: "POST", body: JSON.stringify({ text }) },
    ),

  dismiss: (jid: string) =>
    apiFetch(`/contacts/${encodeURIComponent(jid)}/dismiss`, {
      method: "POST",
    }),

  undismiss: (jid: string) =>
    apiFetch(`/contacts/${encodeURIComponent(jid)}/undismiss`, {
      method: "POST",
    }),

  block: (jid: string) =>
    apiFetch(`/contacts/${encodeURIComponent(jid)}/block`, {
      method: "POST",
    }),

  unblock: (jid: string) =>
    apiFetch(`/contacts/${encodeURIComponent(jid)}/unblock`, {
      method: "POST",
    }),

  getStats: () => apiFetch<import("../types").Stats>("/stats"),

  triggerSync: () => apiFetch("/sync", { method: "POST" }),

  getWAHASession: () => apiFetch<WAHASession>("/waha/session"),

  startWAHASession: () =>
    apiFetch("/waha/start", { method: "POST" }),

  stopWAHASession: () =>
    apiFetch("/waha/stop", { method: "POST" }),

  getSettings: () =>
    apiFetch<{ sync_interval_minutes: number }>("/settings"),

  updateSettings: (syncIntervalMinutes: number) =>
    apiFetch<{ sync_interval_minutes: number }>("/settings", {
      method: "POST",
      body: JSON.stringify({ sync_interval_minutes: syncIntervalMinutes }),
    }),
};
