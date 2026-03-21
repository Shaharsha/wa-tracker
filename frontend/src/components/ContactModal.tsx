import { useState, useRef, useEffect } from "react";
import type { Contact, Message } from "../types";
import { MessageThread } from "./MessageThread";
import { formatWaitTime, getUrgencyDot } from "../utils/time";
import { api } from "../api/client";

interface Props {
  contact: Contact;
  messages: Message[];
  loading: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onBlock: () => void;
  onUndismiss: () => void;
  onUnblock: () => void;
  onMessageSent: () => void;
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
  onMessageSent,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayName = contact.name || `+${contact.phone}`;
  const initial = (contact.name || contact.phone)[0]?.toUpperCase() || "?";
  const hue = displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  // Scroll to bottom when messages load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.sendMessage(contact.jid, text);
      setReply("");
      onMessageSent();
      // Auto-resize textarea back
      if (inputRef.current) inputRef.current.style.height = "auto";
    } catch {
      // Keep text in input so user can retry
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-[480px] sm:max-w-[90vw] sm:rounded-2xl rounded-t-2xl shadow-xl border border-stone-200/60 flex flex-col max-h-[90vh] sm:max-h-[80vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-stone-100 shrink-0">
          {contact.profile_picture_url && !imgError ? (
            <img
              src={contact.profile_picture_url}
              alt={displayName}
              className="w-10 h-10 rounded-xl object-cover shadow-sm"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-sm shadow-sm"
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
              <div className="flex items-center gap-1 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${getUrgencyDot(contact.waiting_seconds)}`} />
                <span className="text-[11px] text-stone-400 tabular-nums">
                  {formatWaitTime(contact.waiting_seconds)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {contact.unanswered_count} unanswered &middot; +{contact.phone}
            </p>
          </div>

          {/* Actions toggle */}
          <button
            onClick={() => setShowActions(!showActions)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-all cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-all cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Actions dropdown */}
        {showActions && (
          <div className="flex items-center gap-2 px-4 sm:px-5 py-2 border-b border-stone-100 bg-stone-50/50 animate-fade-in">
            {contact.is_blocked ? (
              <button onClick={() => { onUnblock(); }} className="text-xs font-medium text-sage-600 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-lg border border-sage-100 transition-all cursor-pointer">
                Unblock
              </button>
            ) : contact.is_dismissed ? (
              <button onClick={() => { onUndismiss(); }} className="text-xs font-medium text-sage-600 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-lg border border-sage-100 transition-all cursor-pointer">
                Restore
              </button>
            ) : (
              <>
                <button onClick={() => { onDismiss(); }} className="text-xs font-medium text-stone-500 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 transition-all cursor-pointer">
                  Skip
                </button>
                <button onClick={() => { onBlock(); }} className="text-xs font-medium text-coral-500 bg-white hover:bg-coral-50 px-3 py-1.5 rounded-lg border border-coral-100 transition-all cursor-pointer">
                  Block forever
                </button>
              </>
            )}
          </div>
        )}

        {/* Messages — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          <MessageThread messages={messages} loading={loading} />
        </div>

        {/* Reply input */}
        <div className="shrink-0 border-t border-stone-100 bg-white px-3 sm:px-4 py-2.5 sm:rounded-b-2xl">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={reply}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Reply..."
              dir="auto"
              rows={1}
              className="flex-1 text-sm sm:text-[13px] text-stone-800 placeholder:text-stone-300 border border-stone-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-300 transition-all leading-relaxed"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="shrink-0 w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center hover:bg-stone-700 active:bg-stone-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
            >
              {sending ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
