import { useState } from "react";
import { StatsBar } from "./components/StatsBar";
import { ContactList } from "./components/ContactList";
import { QRSetup } from "./components/QRSetup";
import { useContacts } from "./hooks/useContacts";
import { hasToken, setToken, api } from "./api/client";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-80"
      >
        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          WA Tracker
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          Sign in to your dashboard.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-3 bg-red-50 rounded px-3 py-2">
            {error}
          </p>
        )}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-300"
          autoFocus
          autoComplete="username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-300"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded-md py-2 text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Dashboard() {
  const { contacts, dismissed, loading, error, refresh } = useContacts();
  const [showQR, setShowQR] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StatsBar onShowQR={() => setShowQR(true)} />
      <ContactList
        contacts={contacts}
        dismissed={dismissed}
        onRefresh={refresh}
      />
      {showQR && <QRSetup onClose={() => setShowQR(false)} />}
    </div>
  );
}

export default function App() {
  if (!hasToken()) {
    return <LoginScreen />;
  }
  return <Dashboard />;
}
