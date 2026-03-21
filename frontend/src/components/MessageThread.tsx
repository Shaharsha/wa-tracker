import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { formatTimestamp, formatMediaType } from "../utils/time";

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
              className={`max-w-[80%] rounded-2xl text-[13px] leading-relaxed shadow-sm overflow-hidden ${
                msg.from_me
                  ? "bg-stone-800 text-stone-100 rounded-br-md"
                  : "bg-white text-stone-700 border border-stone-200/80 rounded-bl-md"
              } ${msg.media_url ? "" : "px-3.5 py-2.5"}`}
            >
              {msg.media_url && ["image", "sticker"].includes(msg.message_type) && (
                <img
                  src={`/api/media/${msg.media_url}`}
                  alt=""
                  className="max-w-full max-h-64 object-contain"
                  loading="lazy"
                />
              )}
              {msg.media_url && msg.message_type === "video" && (
                <video
                  src={`/api/media/${msg.media_url}`}
                  controls
                  className="max-w-full max-h-64"
                  preload="metadata"
                />
              )}
              {msg.media_url && ["audio", "ptt"].includes(msg.message_type) && (
                <div className="px-3.5 py-2.5">
                  <audio src={`/api/media/${msg.media_url}`} controls className="w-full h-8" preload="metadata" />
                </div>
              )}
              <div className={msg.media_url ? "px-3.5 py-2" : ""}>
                {msg.body ? (
                  <p dir="auto" className="break-words whitespace-pre-wrap">{msg.body}</p>
                ) : !msg.media_url ? (
                  <p>
                    <span className={`italic ${msg.from_me ? "text-stone-400" : "text-stone-300"}`}>
                      {formatMediaType(msg.message_type) || "Message"}
                    </span>
                  </p>
                ) : null}
              </div>
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
