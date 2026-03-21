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

export const api = {
  getUnanswered: (includeDismissed = false) =>
    apiFetch<import("../types").Contact[]>(
      `/contacts/unanswered?include_dismissed=${includeDismissed}`
    ),

  getDismissed: () =>
    apiFetch<import("../types").Contact[]>("/contacts/dismissed"),

  getMessages: (jid: string, limit = 50) =>
    apiFetch<import("../types").Message[]>(
      `/contacts/${encodeURIComponent(jid)}/messages?limit=${limit}`
    ),

  dismiss: (jid: string) =>
    apiFetch(`/contacts/${encodeURIComponent(jid)}/dismiss`, {
      method: "POST",
    }),

  undismiss: (jid: string) =>
    apiFetch(`/contacts/${encodeURIComponent(jid)}/undismiss`, {
      method: "POST",
    }),

  getStats: () => apiFetch<import("../types").Stats>("/stats"),

  triggerSync: () => apiFetch("/sync", { method: "POST" }),
};
