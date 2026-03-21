import { useState } from "react";
import { StatsBar } from "./components/StatsBar";
import { ContactList } from "./components/ContactList";
import { useContacts } from "./hooks/useContacts";
import { hasToken, setToken } from "./api/client";

function LoginScreen() {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setToken(input.trim());
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-80"
      >
        <h1 className="text-lg font-semibold text-gray-900 mb-4">
          WA Tracker
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          Enter your access token to continue.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Access token"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-300"
          autoFocus
        />
        <button
          type="submit"
          className="w-full bg-gray-900 text-white rounded-md py-2 text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

function Dashboard() {
  const { contacts, dismissed, loading, error, refresh } = useContacts();

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
      <StatsBar />
      <ContactList
        contacts={contacts}
        dismissed={dismissed}
        onRefresh={refresh}
      />
    </div>
  );
}

export default function App() {
  if (!hasToken()) {
    return <LoginScreen />;
  }
  return <Dashboard />;
}
