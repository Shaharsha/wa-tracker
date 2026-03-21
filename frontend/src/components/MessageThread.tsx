import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { formatTimestamp, formatMediaType } from "../utils/time";

function mediaUrl(path: string): string {
  const token = localStorage.getItem("wa_tracker_token") || "";
  return `/api/media/${path}?token=${encodeURIComponent(token)}`;
}

interface Props {
  messages: Message[];
  loading: boolean;
}

export function MessageThread({ messages, loading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const behavior = prevCount.current === 0 ? "instant" : "smooth";
      const delay = prevCount.current === 0 ? 150 : 0;
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: behavior as ScrollBehavior });
      }, delay);
      prevCount.current = messages.length;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-stone-300 text-xs">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-stone-300 text-xs">No messages found</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-stone-50/80 px-4 sm:px-5 py-4">
        <div className="space-y-2.5 max-w-lg mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}
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
                    src={mediaUrl(msg.media_url)}
                    alt=""
                    className="max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => setExpandedImage(mediaUrl(msg.media_url!))}
                  />
                )}
                {msg.media_url && msg.message_type === "video" && (
                  <video
                    src={mediaUrl(msg.media_url)}
                    controls
                    className="max-w-full max-h-64"
                    preload="metadata"
                  />
                )}
                {msg.media_url && ["audio", "ptt"].includes(msg.message_type) && (
                  <div className="px-3.5 py-2.5">
                    <audio src={mediaUrl(msg.media_url)} controls className="w-full h-8" preload="metadata" />
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
                <p className={`text-[10px] mt-1 ${msg.media_url ? "px-3.5 pb-2" : ""} ${
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

      {/* Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center cursor-pointer animate-fade-in"
          onClick={() => setExpandedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            onClick={() => setExpandedImage(null)}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={expandedImage}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
