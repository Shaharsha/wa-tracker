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

export type UrgencyLevel = "fresh" | "warm" | "hot" | "critical";

export function getUrgencyLevel(seconds: number): UrgencyLevel {
  const hours = seconds / 3600;
  if (hours < 1) return "fresh";
  if (hours < 4) return "warm";
  if (hours < 24) return "hot";
  return "critical";
}

export function getUrgencyClasses(seconds: number): string {
  const level = getUrgencyLevel(seconds);
  switch (level) {
    case "fresh":
      return "bg-sage-50 text-sage-600 border-sage-100";
    case "warm":
      return "bg-amber-50 text-amber-600 border-amber-100";
    case "hot":
      return "bg-coral-50 text-coral-600 border-coral-100";
    case "critical":
      return "bg-coral-100 text-coral-600 border-coral-500";
  }
}

export function getUrgencyDot(seconds: number): string {
  const level = getUrgencyLevel(seconds);
  switch (level) {
    case "fresh":
      return "bg-sage-500";
    case "warm":
      return "bg-amber-500";
    case "hot":
      return "bg-coral-500";
    case "critical":
      return "bg-coral-600";
  }
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
