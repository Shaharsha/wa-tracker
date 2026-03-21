import type { Contact } from "../types";
import { formatRelativeTime, formatWaitTime, getUrgencyColor } from "../utils/time";
import { DismissButton } from "./DismissButton";

interface Props {
  contact: Contact;
  isExpanded: boolean;
  onClick: () => void;
  onDismiss: () => void;
  onUndismiss: () => void;
}

export function ContactRow({
  contact,
  isExpanded,
  onClick,
  onDismiss,
  onUndismiss,
}: Props) {
  const displayName = contact.name || `+${contact.phone}`;
  const preview =
    contact.last_message_preview.length > 80
      ? contact.last_message_preview.slice(0, 80) + "..."
      : contact.last_message_preview;

  return (
    <div
      className={`group border-b border-gray-100 cursor-pointer transition-colors ${
        isExpanded ? "bg-gray-50" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-sm shrink-0">
          {(contact.name || contact.phone)[0]?.toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {displayName}
            </span>
            <span className="text-xs text-gray-400">
              {formatRelativeTime(contact.waiting_seconds)}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">{preview}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {contact.unanswered_count > 0 && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${getUrgencyColor(
                contact.waiting_seconds
              )}`}
            >
              {contact.unanswered_count}
            </span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${getUrgencyColor(
              contact.waiting_seconds
            )}`}
          >
            {formatWaitTime(contact.waiting_seconds)}
          </span>
          <DismissButton
            isDismissed={!!contact.is_dismissed}
            onDismiss={onDismiss}
            onUndismiss={onUndismiss}
          />
        </div>
      </div>
    </div>
  );
}
