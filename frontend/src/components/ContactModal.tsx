import { useState, useRef, useEffect, useCallback } from "react";
import type { Contact, Message } from "../types";
import { MessageThread } from "./MessageThread";
import { formatWaitTime, getUrgencyDot } from "../utils/time";
import { api } from "../api/client";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = useCallback((emoji: { native: string }) => {
    const el = inputRef.current;
    if (!el) {
      setReply((prev) => prev + emoji.native);
      return;
    }
    const start = el.selectionStart ?? reply.length;
    const end = el.selectionEnd ?? reply.length;
    const newText = reply.slice(0, start) + emoji.native + reply.slice(end);
    setReply(newText);
    setShowEmojiPicker(false);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      const pos = start + emoji.native.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }, [reply]);

  // Replace :shortcodes: with emoji characters
  const replaceShortcodes = useCallback((text: string): string => {
    return text.replace(/:([a-z0-9_+-]+):/g, (match, code) => {
      // Search emoji-mart data for the shortcode
      const emojis = (data as { emojis: Record<string, { skins: { native: string }[] }> }).emojis;
      const emoji = emojis[code];
      if (emoji?.skins?.[0]?.native) return emoji.skins[0].native;
      return match; // Keep original if not found
    });
  }, []);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;
    // Check if a shortcode was just completed (ends with : followed by space/enter)
    if (value.match(/:[a-z0-9_+-]+:\s?$/)) {
      value = replaceShortcodes(value);
    }
    setReply(value);
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
        className="bg-white w-full sm:w-[480px] sm:max-w-[90vw] sm:rounded-2xl rounded-t-2xl shadow-xl border border-stone-200/60 flex flex-col h-[85dvh] sm:h-[80vh] animate-slide-up"
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

          {/* Skip button — always visible */}
          {!contact.is_blocked && !contact.is_dismissed && (
            <button
              onClick={onDismiss}
              className="text-xs text-stone-400 hover:text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 transition-all cursor-pointer shrink-0"
            >
              Skip
            </button>
          )}
          {contact.is_dismissed && (
            <button
              onClick={onUndismiss}
              className="text-xs text-sage-600 hover:text-sage-700 px-2.5 py-1.5 rounded-lg hover:bg-sage-50 transition-all cursor-pointer shrink-0"
            >
              Restore
            </button>
          )}
          {contact.is_blocked && (
            <button
              onClick={onUnblock}
              className="text-xs text-sage-600 hover:text-sage-700 px-2.5 py-1.5 rounded-lg hover:bg-sage-50 transition-all cursor-pointer shrink-0"
            >
              Unblock
            </button>
          )}

          {/* More actions (block) — rare */}
          {!contact.is_blocked && !contact.is_dismissed && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowActions(!showActions)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {showActions && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-10 animate-fade-in">
                  <button
                    onClick={() => { setShowActions(false); onBlock(); }}
                    className="text-xs text-coral-500 hover:bg-coral-50 px-4 py-2 w-full text-left whitespace-nowrap cursor-pointer"
                  >
                    Block forever
                  </button>
                </div>
              )}
            </div>
          )}

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
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          <MessageThread messages={messages} loading={loading} />
        </div>

        {/* Emoji picker — desktop only */}
        {showEmojiPicker && (
          <div className="shrink-0 border-t border-stone-100 bg-white hidden sm:flex justify-center py-2">
            <Picker
              data={data}
              onEmojiSelect={insertEmoji}
              theme="light"
              previewPosition="none"
              skinTonePosition="search"
              perLine={8}
              maxFrequentRows={2}
            />
          </div>
        )}

        {/* Reply input */}
        <div className="shrink-0 border-t border-stone-100 bg-white px-3 sm:px-4 py-2.5 sm:rounded-b-2xl">
          <div className="flex items-end gap-1.5">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`shrink-0 w-10 h-10 rounded-xl hidden sm:flex items-center justify-center transition-all cursor-pointer ${
                showEmojiPicker ? "bg-stone-100 text-stone-600" : "text-stone-300 hover:text-stone-500 hover:bg-stone-50"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={reply}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Reply..."
              dir="auto"
              rows={1}
              className="flex-1 text-base sm:text-[13px] text-stone-800 placeholder:text-stone-300 border border-stone-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-300 transition-all leading-relaxed"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-xl bg-stone-800 text-white flex items-center justify-center hover:bg-stone-700 active:bg-stone-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
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
