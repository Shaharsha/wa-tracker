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
      <div className="px-4 py-6 text-center text-gray-400 text-sm">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-gray-400 text-sm">
        No messages found
      </div>
    );
  }

  return (
    <div className="bg-gray-50 px-4 py-3 max-h-80 overflow-y-auto space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              msg.from_me
                ? "bg-green-100 text-green-900"
                : "bg-white text-gray-900 border border-gray-200"
            }`}
          >
            <p className="break-words whitespace-pre-wrap">
              {msg.body || (
                <span className="italic text-gray-400">
                  [{msg.message_type}]
                </span>
              )}
            </p>
            <p
              className={`text-[10px] mt-1 ${
                msg.from_me ? "text-green-600" : "text-gray-400"
              }`}
            >
              {formatTimestamp(msg.timestamp)}
            </p>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
