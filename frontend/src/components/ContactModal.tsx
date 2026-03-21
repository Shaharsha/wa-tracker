import { useState } from "react";
import type { Contact, Message } from "../types";
import { MessageThread } from "./MessageThread";
import { formatWaitTime, getUrgencyDot } from "../utils/time";

interface Props {
  contact: Contact;
  messages: Message[];
  loading: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onBlock: () => void;
  onUndismiss: () => void;
  onUnblock: () => void;
}

export function ContactModal({
  contact,
  messages,
  loading,
  onClose,
  onDismiss,
  onBlock,
  onUndismiss,
  onUnblock,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const displayName = contact.name || `+${contact.phone}`;
  const initial = (contact.name || contact.phone)[0]?.toUpperCase() || "?";
  const hue = displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-[480px] sm:max-w-[90vw] sm:rounded-2xl rounded-t-2xl shadow-xl border border-stone-200/60 flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 shrink-0">
          {/* Avatar */}
          {contact.profile_picture_url && !imgError ? (
            <img
              src={contact.profile_picture_url}
              alt={displayName}
              className="w-11 h-11 rounded-xl object-cover shadow-sm"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-medium text-sm shadow-sm"
              style={{
                background: `linear-gradient(135deg, hsl(${hue}, 40%, 55%), hsl(${hue + 20}, 45%, 45%))`,
              }}
            >
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-800 text-[15px] truncate">
                {displayName}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${getUrgencyDot(contact.waiting_seconds)}`} />
                <span className="text-[11px] text-stone-400 tabular-nums font-medium">
                  {formatWaitTime(contact.waiting_seconds)} waiting
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {contact.unanswered_count} unanswered message{contact.unanswered_count !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-all cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <MessageThread messages={messages} loading={loading} />
        </div>

        {/* Actions footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-stone-100 shrink-0 bg-white sm:rounded-b-2xl">
          {contact.is_blocked ? (
            <button
              onClick={onUnblock}
              className="text-xs font-medium text-sage-600 bg-sage-50 hover:bg-sage-100 px-4 py-2 rounded-lg border border-sage-100 transition-all cursor-pointer"
            >
              Unblock
            </button>
          ) : contact.is_dismissed ? (
            <button
              onClick={onUndismiss}
              className="text-xs font-medium text-sage-600 bg-sage-50 hover:bg-sage-100 px-4 py-2 rounded-lg border border-sage-100 transition-all cursor-pointer"
            >
              Restore
            </button>
          ) : (
            <>
              <button
                onClick={onDismiss}
                className="text-xs font-medium text-stone-500 bg-stone-50 hover:bg-stone-100 px-4 py-2 rounded-lg border border-stone-200 transition-all cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={onBlock}
                className="text-xs font-medium text-coral-500 bg-coral-50 hover:bg-coral-100 px-4 py-2 rounded-lg border border-coral-100 transition-all cursor-pointer"
              >
                Block
              </button>
            </>
          )}
          <div className="flex-1" />
          <span className="text-[11px] text-stone-300">
            +{contact.phone}
          </span>
        </div>
      </div>
    </div>
  );
}
