import { useState, useEffect, useCallback, useRef } from "react";
import { api, type WAHASession } from "../api/client";

interface Props {
  onClose: () => void;
  inline?: boolean;
}

export function QRSetup({ onClose, inline = false }: Props) {
  const [session, setSession] = useState<WAHASession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getWAHASession();
      setSession(data);
      setError(null);
      // If connected, notify parent
      if (data.status === "WORKING" && inline) {
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch session");
    } finally {
      setLoading(false);
    }
  }, [inline, onClose]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 5000);
    return () => {
      clearInterval(interval);
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    };
  }, [fetchSession]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await api.startWAHASession();
      startTimeoutRef.current = setTimeout(fetchSession, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setLoading(false);
    }
  };

  const content = (
    <>
      {loading && !session && (
        <div className="py-8">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-400 text-sm">Checking session status...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-coral-600 bg-coral-50 rounded-xl px-4 py-3 border border-coral-100">
          {error}
        </div>
      )}

      {session && (
        <>
          {["WORKING", "SCAN_QR_CODE"].includes(session.status) && (
            <div className="mb-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                session.status === "WORKING"
                  ? "bg-sage-50 text-sage-600 border border-sage-100"
                  : "bg-amber-50 text-amber-600 border border-amber-100"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  session.status === "WORKING" ? "bg-sage-500" : "bg-amber-500 animate-pulse"
                }`} />
                {session.status === "WORKING" ? "Connected" : "Waiting for scan"}
              </span>
            </div>
          )}

          {session.status === "WORKING" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center mx-auto mb-4 border border-sage-100">
                <svg className="w-6 h-6 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-medium text-stone-700">Connected</p>
              <p className="text-stone-400 text-sm mt-1">WhatsApp is linked and syncing.</p>
            </div>
          )}

          {session.status === "SCAN_QR_CODE" && session.qr?.data && (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                Open WhatsApp &rarr; Linked Devices &rarr; Link a Device
              </p>
              <div className="inline-block p-3 bg-white rounded-2xl border border-stone-200 shadow-sm">
                <img
                  src={`data:${session.qr.mimetype};base64,${session.qr.data}`}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56"
                />
              </div>
              <p className="text-[11px] text-stone-300 mt-4">
                Refreshes automatically every 5 seconds.
              </p>
            </div>
          )}

          {!["WORKING", "SCAN_QR_CODE"].includes(session.status) && (
            <div className="py-4">
              <p className="text-sm text-stone-500 mb-5">
                Start a session to generate a QR code for linking.
              </p>
              <button
                onClick={handleStart}
                className="bg-stone-800 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-all cursor-pointer shadow-sm shadow-stone-800/10"
              >
                Start Session
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  // Inline mode — no modal wrapper
  if (inline) {
    return <div className="text-center">{content}</div>;
  }

  // Modal mode
  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-96 max-w-[90vw] overflow-hidden animate-scale-in border border-stone-200/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-serif text-lg text-stone-800">WhatsApp Connection</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-6 text-center">{content}</div>
      </div>
    </div>
  );
}
