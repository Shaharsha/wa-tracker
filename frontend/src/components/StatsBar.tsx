import { useState, useEffect } from "react";
import { api, clearToken } from "../api/client";
import type { Stats } from "../types";
import { formatRelativeTime } from "../utils/time";

interface Props {
  onShowQR: () => void;
  onSynced: () => void;
}

export function StatsBar({ onShowQR, onSynced }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setStats(await api.getStats());
      } catch {
        /* ignore */
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.triggerSync();
      setStats(await api.getStats());
      onSynced();
    } finally {
      setSyncing(false);
    }
  };

  if (!stats) return null;

  const syncAgo = stats.last_sync_at
    ? formatRelativeTime(
        (Date.now() - new Date(stats.last_sync_at).getTime()) / 1000
      )
    : "never";

  const wahaOk = stats.waha_status === "WORKING";
  const longestLabel = stats.longest_waiting_hours > 0
    ? stats.longest_waiting_hours < 24
      ? `${stats.longest_waiting_hours}h`
      : `${Math.floor(stats.longest_waiting_hours / 24)}d`
    : null;

  return (
    <header className="bg-white border-b border-stone-200/80 animate-fade-in sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
            <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#hbg)" />
            <rect x="2.5" y="2.5" width="59" height="59" rx="13.5" stroke="white" strokeOpacity="0.08" />
            <path d="M18 20C18 17.79 19.79 16 22 16H42C44.21 16 46 17.79 46 20V34C46 36.21 44.21 38 42 38H28L20 44V38H22H18V20Z" fill="white" />
            <circle cx="32" cy="27" r="7" stroke="#2d2b27" strokeWidth="2" fill="none" />
            <line x1="32" y1="27" x2="32" y2="22" stroke="#2d2b27" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="27" x2="35.5" y2="29" stroke="#d4940a" strokeWidth="2" strokeLinecap="round" />
            <circle cx="44" cy="18" r="4.5" fill="#d4940a" />
            <circle cx="44" cy="18" r="2.5" fill="#fbbf24" opacity="0.5" />
            <defs><linearGradient id="hbg" x1="2" y1="2" x2="62" y2="62"><stop stopColor="#3d3a35"/><stop offset="1" stopColor="#1a1917"/></linearGradient></defs>
          </svg>
          <h1 className="text-stone-900 text-[15px] font-semibold tracking-tight hidden sm:block">
            <span className="text-stone-400 font-normal">wa</span>tracker
          </h1>
        </div>

        {/* Stats inline */}
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-400 flex-1 min-w-0">
          <span className="shrink-0">
            <span className="font-semibold text-coral-500 tabular-nums">{stats.total_unanswered}</span> waiting
          </span>
          {longestLabel && (
            <>
              <span className="text-stone-200">&middot;</span>
              <span className="shrink-0">longest <span className="font-semibold text-stone-600 tabular-nums">{longestLabel}</span></span>
            </>
          )}
          <span className="text-stone-200">&middot;</span>
          <span className="shrink-0 truncate">synced <span className="font-medium text-stone-600">{syncAgo}</span></span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onShowQR}
            className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm"
            style={{
              background: wahaOk ? "var(--color-sage-50)" : "var(--color-coral-50)",
              borderColor: wahaOk ? "var(--color-sage-100)" : "var(--color-coral-100)",
              color: wahaOk ? "var(--color-sage-600)" : "var(--color-coral-600)",
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${wahaOk ? "bg-sage-500" : "bg-coral-500 animate-pulse"}`} />
            <span className="hidden sm:inline">{wahaOk ? "Connected" : stats.waha_status}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-50 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          <button
            onClick={() => { clearToken(); window.location.reload(); }}
            className="text-stone-300 hover:text-stone-500 p-1.5 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
