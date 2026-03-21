import { useState } from "react";
import type { Contact } from "../types";
import { formatRelativeTime, formatWaitTime, getUrgencyClasses, getUrgencyDot, formatMediaType } from "../utils/time";

interface Props {
  contact: Contact;
  onClick: () => void;
  onSkip: () => void;
  index: number;
}

export function ContactRow({ contact, onClick, onSkip, index }: Props) {
  const [imgError, setImgError] = useState(false);
  const displayName = contact.name || `+${contact.phone}`;
  const rawPreview = contact.last_message_preview || "";
  const mediaLabel = formatMediaType(contact.last_message_type || "chat");
  const preview = rawPreview
    ? rawPreview.length > 90 ? rawPreview.slice(0, 90) + "\u2026" : rawPreview
    : mediaLabel ? `${mediaLabel}` : "";

  const initial = (contact.name || contact.phone)[0]?.toUpperCase() || "?";
  const hue = displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="animate-slide-up group cursor-pointer transition-all duration-200"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      <div className="flex gap-3 px-4 sm:px-5 py-3 sm:py-4 transition-colors duration-150 hover:bg-stone-50 active:bg-stone-100/60">
        {/* Avatar */}
        {contact.profile_picture_url && !imgError ? (
          <img
            src={contact.profile_picture_url}
            alt={displayName}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 mt-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white font-medium text-sm shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 mt-0.5"
            style={{
              background: `linear-gradient(135deg, hsl(${hue}, 40%, 55%), hsl(${hue + 20}, 45%, 45%))`,
            }}
          >
            {initial}
          </div>
        )}

        {/* Content + Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-800 truncate text-[15px] flex-1 min-w-0">
              {displayName}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {contact.unanswered_count > 0 && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${getUrgencyClasses(contact.waiting_seconds)}`}>
                  {contact.unanswered_count}
                </span>
              )}
              <span className={`w-1.5 h-1.5 rounded-full ${getUrgencyDot(contact.waiting_seconds)}`} />
              <span className="text-[11px] text-stone-400 tabular-nums font-medium">
                {formatWaitTime(contact.waiting_seconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <p dir="auto" className="text-[13px] text-stone-400 truncate flex-1 min-w-0 leading-relaxed">
              {mediaLabel && !rawPreview ? (
                <span className="italic">{mediaLabel}</span>
              ) : (
                preview
              )}
            </p>
            <span className="text-[11px] text-stone-300 shrink-0 hidden sm:inline">
              {formatRelativeTime(contact.waiting_seconds)}
            </span>
            {!contact.is_blocked && !contact.is_dismissed && (
              <button
                onClick={(e) => { e.stopPropagation(); onSkip(); }}
                className="text-[11px] text-stone-300 hover:text-stone-600 px-2 py-0.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer shrink-0"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-4 sm:mx-5">
        <div className="border-b border-stone-100" />
      </div>
    </div>
  );
}
