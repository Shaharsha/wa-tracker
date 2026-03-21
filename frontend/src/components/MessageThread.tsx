import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { formatTimestamp } from "../utils/time";

interface Props {
  messages: Message[];
  loading: boolean;
}

export function MessageThread({ messages, loading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-stone-300 text-xs">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-stone-300 text-xs">No messages found</p>
      </div>
    );
  }

  return (
    <div className="bg-stone-50/80 border-t border-stone-100 px-5 py-4 max-h-80 overflow-y-auto">
      <div className="space-y-2.5 max-w-lg mx-auto">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex ${msg.from_me ? "justify-end" : "justify-start"} animate-fade-in`}
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                msg.from_me
                  ? "bg-stone-800 text-stone-100 rounded-br-md"
                  : "bg-white text-stone-700 border border-stone-200/80 rounded-bl-md"
              }`}
            >
              <p className="break-words whitespace-pre-wrap">
                {msg.body || (
                  <span className={msg.from_me ? "text-stone-400" : "text-stone-300"}>
                    [{msg.message_type}]
                  </span>
                )}
              </p>
              <p className={`text-[10px] mt-1 ${
                msg.from_me ? "text-stone-400" : "text-stone-300"
              }`}>
                {formatTimestamp(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
