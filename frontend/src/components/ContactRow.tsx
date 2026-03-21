import type { Contact } from "../types";
import { formatRelativeTime, formatWaitTime, getUrgencyClasses, getUrgencyDot } from "../utils/time";
import { DismissButton } from "./DismissButton";

interface Props {
  contact: Contact;
  isExpanded: boolean;
  onClick: () => void;
  onDismiss: () => void;
  onUndismiss: () => void;
  index: number;
}

export function ContactRow({
  contact,
  isExpanded,
  onClick,
  onDismiss,
  onUndismiss,
  index,
}: Props) {
  const displayName = contact.name || `+${contact.phone}`;
  const preview =
    contact.last_message_preview.length > 90
      ? contact.last_message_preview.slice(0, 90) + "\u2026"
      : contact.last_message_preview;

  const initial = (contact.name || contact.phone)[0]?.toUpperCase() || "?";

  // Generate a warm color for the avatar based on the name
  const hue = displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="animate-slide-up group cursor-pointer transition-all duration-200"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      <div className={`flex items-center gap-3.5 px-5 py-4 transition-colors duration-150 ${
        isExpanded ? "bg-stone-100/60" : "hover:bg-stone-50"
      }`}>
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-medium text-sm shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 40%, 55%), hsl(${hue + 20}, 45%, 45%))`,
          }}
        >
          {initial}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-stone-800 truncate text-[15px]">
              {displayName}
            </span>
            <span className="text-[11px] text-stone-400 shrink-0">
              {formatRelativeTime(contact.waiting_seconds)}
            </span>
          </div>
          <p className="text-[13px] text-stone-400 truncate mt-0.5 leading-relaxed">
            {preview || <span className="italic">[media]</span>}
          </p>
        </div>

        {/* Badges + Action */}
        <div className="flex items-center gap-2 shrink-0">
          {contact.unanswered_count > 0 && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getUrgencyClasses(contact.waiting_seconds)}`}>
              {contact.unanswered_count}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${getUrgencyDot(contact.waiting_seconds)}`} />
            <span className="text-[11px] text-stone-400 tabular-nums font-medium">
              {formatWaitTime(contact.waiting_seconds)}
            </span>
          </div>
          <DismissButton
            isDismissed={!!contact.is_dismissed}
            onDismiss={onDismiss}
            onUndismiss={onUndismiss}
          />
        </div>
      </div>

      {/* Subtle separator */}
      <div className="mx-5">
        <div className="border-b border-stone-100" />
      </div>
    </div>
  );
}
