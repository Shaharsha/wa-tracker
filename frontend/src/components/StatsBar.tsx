import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Stats } from "../types";
import { formatRelativeTime } from "../utils/time";

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

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

  if (!stats) return null;

  const syncAgo = stats.last_sync_at
    ? formatRelativeTime(
        (Date.now() - new Date(stats.last_sync_at).getTime()) / 1000
      )
    : "never";

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-red-600">
          {stats.total_unanswered}
        </span>
        <span className="text-gray-600">unanswered</span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5">
        <span className="text-gray-600">Longest wait:</span>
        <span className="font-semibold">
          {stats.longest_waiting_hours > 0
            ? `${stats.longest_waiting_hours}h`
            : "—"}
        </span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5">
        <span className="text-gray-600">Last sync:</span>
        <span className="font-medium">{syncAgo}</span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5">
        <span className="text-gray-600">WAHA:</span>
        <span
          className={`font-medium ${
            stats.waha_status === "WORKING"
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {stats.waha_status}
        </span>
      </div>
      <button
        onClick={() => api.triggerSync().then(() => window.location.reload())}
        className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
      >
        Sync now
      </button>
    </div>
  );
}
