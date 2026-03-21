import { useState, useRef, useEffect } from "react";
import type { Contact } from "../types";
import { ContactRow } from "./ContactRow";
import { MessageThread } from "./MessageThread";
import { EmptyState } from "./EmptyState";
import { useMessages } from "../hooks/useMessages";
import { api } from "../api/client";

interface Props {
  contacts: Contact[];
  dismissed: Contact[];
  blocked: Contact[];
  onRefresh: () => void;
}

type Tab = "unanswered" | "dismissed" | "blocked";

export function ContactList({ contacts, dismissed, blocked, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("unanswered");
  const [search, setSearch] = useState("");
  const [expandedJid, setExpandedJid] = useState<string | null>(null);
  const { messages, loading: msgsLoading, fetchMessages, clear } = useMessages();

  const list = tab === "unanswered" ? contacts : tab === "dismissed" ? dismissed : blocked;
  const filtered = search
    ? list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search)
      )
    : list;

  const handleExpand = (jid: string) => {
    if (expandedJid === jid) {
      setExpandedJid(null);
      clear();
    } else {
      clear();
      setExpandedJid(jid);
      fetchMessages(jid);
    }
  };

  const action = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setExpandedJid(null);
      onRefresh();
    } catch { /* will refresh on next auto-poll */ }
  };

  return (
    <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      {/* Tab bar + Search — sticky below header */}
      <div className="sticky top-[85px] z-10 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200/60">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5">
          <div className="flex items-center bg-stone-100 rounded-lg p-0.5 shrink-0">
            {([
              { key: "unanswered" as Tab, label: "Unanswered", count: contacts.length, accent: true },
              { key: "dismissed" as Tab, label: "Skipped", count: dismissed.length, accent: false },
              { key: "blocked" as Tab, label: "Blocked", count: blocked.length, accent: false },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-all cursor-pointer ${
                  tab === t.key
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-1 tabular-nums ${tab === t.key && t.accent ? "text-coral-500" : ""}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="ml-auto relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-base sm:text-xs border border-stone-200 rounded-lg pl-7 pr-2.5 py-1.5 w-28 sm:w-44 bg-white text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-300 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 bg-white rounded-b-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          filtered.map((contact, i) => (
            <div key={contact.jid}>
              <ContactRow
                contact={contact}
                isExpanded={expandedJid === contact.jid}
                onClick={() => handleExpand(contact.jid)}
                onDismiss={() => action(() => api.dismiss(contact.jid))}
                onBlock={() => action(() => api.block(contact.jid))}
                onUndismiss={() => action(() => api.undismiss(contact.jid))}
                onUnblock={() => action(() => api.unblock(contact.jid))}
                index={i}
              />
              <ExpandableThread
                isOpen={expandedJid === contact.jid}
                messages={messages}
                loading={msgsLoading}
              />
            </div>
          ))
        )}
      </div>
    </main>
  );
}

// Animated expand/collapse wrapper
function ExpandableThread({
  isOpen,
  messages,
  loading,
}: {
  isOpen: boolean;
  messages: import("../types").Message[];
  loading: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen, messages, loading]);

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxHeight: isOpen ? `${Math.max(height, 320)}px` : "0px" }}
    >
      <div ref={contentRef}>
        {isOpen && <MessageThread messages={messages} loading={loading} />}
      </div>
    </div>
  );
}
