export function formatRelativeTime(seconds: number): string {
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function formatWaitTime(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function getUrgencyColor(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) return "bg-green-100 text-green-800";
  if (hours < 4) return "bg-yellow-100 text-yellow-800";
  if (hours < 24) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
