import { useState, useEffect } from "react";
import { StatsBar } from "./components/StatsBar";
import { ContactList } from "./components/ContactList";
import { QRSetup } from "./components/QRSetup";
import { useContacts } from "./hooks/useContacts";
import { hasToken, setToken, api } from "./api/client";
import type { Stats } from "./types";

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = await api.login(username, password);
      setToken(token);
      window.location.reload();
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(145deg, #faf9f7 0%, #f3f1ed 40%, #e7e4dd 100%)",
      }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #d4940a, transparent)" }} />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #e05a42, transparent)" }} />
      </div>

      <div className="animate-scale-in relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-5" />
          <h1 className="font-serif text-3xl text-stone-900 mb-1">WA Tracker</h1>
          <p className="text-stone-400 text-sm tracking-wide">Don't leave them waiting.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-7 shadow-sm border border-stone-200/60">
          {error && (
            <div className="animate-fade-in mb-5 text-sm text-coral-600 bg-coral-50 rounded-xl px-4 py-3 border border-coral-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm bg-stone-50/50 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-300 transition-all"
                placeholder="Enter username"
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm bg-stone-50/50 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-300 transition-all"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-stone-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-stone-700 active:bg-stone-900 transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-stone-800/10"
          >
            {loading ? "Signing in\u2026" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConnectionRequired({ onConnected }: { onConnected: () => void }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-stone-50)" }}>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="animate-fade-in text-center max-w-md">
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="font-serif text-2xl text-stone-800 mb-2">Connect WhatsApp</h1>
          <p className="text-stone-400 text-sm mb-8 leading-relaxed">
            Your WhatsApp account isn't linked yet. Start a session and scan the QR code
            with your phone to begin tracking unanswered messages.
          </p>
          <QRSetup onClose={onConnected} inline />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { contacts, dismissed, loading, error, refresh } = useContacts();
  const [showQR, setShowQR] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    api.getStats().then((s) => {
      setStats(s);
      setCheckingConnection(false);
    }).catch(() => setCheckingConnection(false));
  }, []);

  if (loading || checkingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-stone-50)" }}>
        <div className="animate-fade-in text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-stone-50)" }}>
        <div className="animate-fade-in text-center">
          <p className="text-coral-500 font-medium mb-2">Something went wrong</p>
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // If WAHA is not connected, show full-page connection flow
  if (stats && stats.waha_status !== "WORKING") {
    return <ConnectionRequired onConnected={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-stone-50)" }}>
      <StatsBar onShowQR={() => setShowQR(true)} />
      <ContactList contacts={contacts} dismissed={dismissed} onRefresh={refresh} />
      {showQR && <QRSetup onClose={() => setShowQR(false)} />}
    </div>
  );
}

// --- Logo component ---
function Logo({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const s = size === "lg" ? 56 : 32;
  const iconS = size === "lg" ? 26 : 14;
  const rounding = size === "lg" ? "rounded-2xl" : "rounded-lg";

  return (
    <div className={`${rounding} inline-flex items-center justify-center shadow-lg ${className}`}
      style={{
        width: s,
        height: s,
        background: "linear-gradient(135deg, #2d2b27 0%, #49463f 100%)",
        boxShadow: "0 4px 14px rgba(45,43,39,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
      <svg width={iconS} height={iconS} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Chat bubble with clock accent */}
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="10" r="3.5" stroke="rgba(212,148,10,0.9)" strokeWidth="1.5" />
        <path d="M12 8.5V10l1.2 1.2" stroke="rgba(212,148,10,0.9)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function App() {
  if (!hasToken()) return <LoginScreen />;
  return <Dashboard />;
}
