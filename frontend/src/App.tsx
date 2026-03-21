import { useState, useEffect } from "react";
import { StatsBar } from "./components/StatsBar";
import { ContactList } from "./components/ContactList";
import { QRSetup } from "./components/QRSetup";
import { useContacts } from "./hooks/useContacts";
import { hasToken, setToken, clearToken, api } from "./api/client";
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
          <button
            onClick={() => { clearToken(); window.location.reload(); }}
            className="mt-8 text-xs text-stone-300 hover:text-stone-500 transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { contacts, dismissed, blocked, loading, error, refresh } = useContacts();
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
      <StatsBar onShowQR={() => setShowQR(true)} onSynced={refresh} />
      <ContactList contacts={contacts} dismissed={dismissed} blocked={blocked} onRefresh={refresh} />
      {showQR && <QRSetup onClose={() => setShowQR(false)} />}
    </div>
  );
}

// --- Logo component ---
function Logo({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const s = size === "lg" ? 64 : 36;

  return (
    <div className={`inline-block ${className}`}>
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background — warm rounded square with depth */}
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#bg)" />
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#noise)" opacity="0.03" />
        <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" stroke="white" strokeOpacity="0.08" />

        {/* Chat bubble — filled, offset for depth */}
        <path d="M18 20C18 17.79 19.79 16 22 16H42C44.21 16 46 17.79 46 20V34C46 36.21 44.21 38 42 38H28L20 44V38H22H18V20Z"
          fill="white" fillOpacity="0.15" transform="translate(1, 1)" />
        <path d="M18 20C18 17.79 19.79 16 22 16H42C44.21 16 46 17.79 46 20V34C46 36.21 44.21 38 42 38H28L20 44V38H22H18V20Z"
          fill="white" />

        {/* Clock face inside bubble */}
        <circle cx="32" cy="27" r="8" stroke="#2d2b27" strokeWidth="1.8" fill="none" />

        {/* Clock hands — minute hand pointing to 2, hour hand to 10 (suggesting time passing) */}
        <line x1="32" y1="27" x2="32" y2="21" stroke="#2d2b27" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="32" y1="27" x2="36.5" y2="29.5" stroke="#d4940a" strokeWidth="2" strokeLinecap="round" />

        {/* Urgency dot — the signature amber notification */}
        <circle cx="44" cy="18" r="5" fill="#d4940a" />
        <circle cx="44" cy="18" r="5" fill="url(#dotGlow)" />
        <circle cx="44" cy="18" r="3" fill="#fbbf24" opacity="0.5" />

        <defs>
          <linearGradient id="bg" x1="2" y1="2" x2="62" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3d3a35" />
            <stop offset="0.5" stopColor="#2d2b27" />
            <stop offset="1" stopColor="#1a1917" />
          </linearGradient>
          <radialGradient id="dotGlow" cx="44" cy="18" r="5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#d4940a" />
          </radialGradient>
          <pattern id="noise" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="1" height="1" fill="white" x="0" y="0" />
            <rect width="1" height="1" fill="white" x="2" y="2" />
          </pattern>
        </defs>
      </svg>
    </div>
  );
}

export default function App() {
  if (!hasToken()) return <LoginScreen />;
  return <Dashboard />;
}
