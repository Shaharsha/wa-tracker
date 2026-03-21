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
      setExpandedJid(jid);
      fetchMessages(jid);
    }
  };

  const handleDismiss = async (jid: string) => {
    await api.dismiss(jid);
    onRefresh();
  };

  const handleUndismiss = async (jid: string) => {
    await api.undismiss(jid);
    onRefresh();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Tabs + Search */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setTab("unanswered")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
            tab === "unanswered"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Unanswered ({contacts.length})
        </button>
        <button
          onClick={() => setTab("dismissed")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
            tab === "dismissed"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Dismissed ({dismissed.length})
        </button>
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto text-sm border border-gray-200 rounded-md px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((contact) => (
            <div key={contact.jid}>
              <ContactRow
                contact={contact}
                isExpanded={expandedJid === contact.jid}
                onClick={() => handleExpand(contact.jid)}
                onDismiss={() => handleDismiss(contact.jid)}
                onUndismiss={() => handleUndismiss(contact.jid)}
              />
              {expandedJid === contact.jid && (
                <MessageThread messages={messages} loading={msgsLoading} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
