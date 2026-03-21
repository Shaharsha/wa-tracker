import { useState } from "react";
import type { Contact } from "../types";
import { ContactRow } from "./ContactRow";
import { MessageThread } from "./MessageThread";
import { EmptyState } from "./EmptyState";
import { useMessages } from "../hooks/useMessages";
import { api } from "../api/client";

interface Props {
  contacts: Contact[];
  dismissed: Contact[];
  onRefresh: () => void;
}

export function ContactList({ contacts, dismissed, onRefresh }: Props) {
  const [tab, setTab] = useState<"unanswered" | "dismissed">("unanswered");
  const [search, setSearch] = useState("");
  const [expandedJid, setExpandedJid] = useState<string | null>(null);
  const { messages, loading: msgsLoading, fetchMessages, clear } = useMessages();

  const list = tab === "unanswered" ? contacts : dismissed;
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

  const handleDismiss = async (jid: string) => {
    try {
      await api.dismiss(jid);
      setExpandedJid(null);
      onRefresh();
    } catch {
      // Silently fail — contact list will refresh on next auto-poll
    }
  };

  const handleUndismiss = async (jid: string) => {
    try {
      await api.undismiss(jid);
      setExpandedJid(null);
      onRefresh();
    } catch {
      // Silently fail
    }
  };

  return (
    <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      {/* Tab bar + Search */}
      <div className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200/60">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab("unanswered")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                tab === "unanswered"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              Unanswered
              {contacts.length > 0 && (
                <span className={`ml-1.5 tabular-nums ${tab === "unanswered" ? "text-coral-500" : ""}`}>
                  {contacts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("dismissed")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                tab === "dismissed"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              Dismissed
              {dismissed.length > 0 && (
                <span className="ml-1.5 tabular-nums">{dismissed.length}</span>
              )}
            </button>
          </div>

          <div className="ml-auto relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-stone-200 rounded-lg pl-8 pr-3 py-2 w-44 bg-white text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-300 transition-all"
            />
          </div>
        </div>
      </div>

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
                onDismiss={() => handleDismiss(contact.jid)}
                onUndismiss={() => handleUndismiss(contact.jid)}
                index={i}
              />
              {expandedJid === contact.jid && (
                <div className="animate-fade-in">
                  <MessageThread messages={messages} loading={msgsLoading} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
