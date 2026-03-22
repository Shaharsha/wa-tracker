import { useState, useEffect, useCallback, useRef } from "react";
import { api, type WAHASession } from "../api/client";

interface Props {
  onClose: () => void;
  inline?: boolean;
}

const QR_TIMEOUT_MS = 120_000; // 2 minutes

export function QRSetup({ onClose, inline = false }: Props) {
  const [session, setSession] = useState<WAHASession | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch session status once on mount (no polling yet)
  useEffect(() => {
    api.getWAHASession()
      .then(setSession)
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = undefined;
    timeoutRef.current = undefined;
    setPolling(false);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getWAHASession();
      setSession(data);
      setError(null);
      if (data.status === "WORKING") {
        stopPolling();
        if (inline) onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch session");
    }
  }, [inline, onClose, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setExpired(false);

    try {
      await api.startWAHASession();

      // Wait a moment for WAHA to initialize, then start polling
      setTimeout(async () => {
        await fetchSession();
        setLoading(false);
        setPolling(true);

        // Poll every 5 seconds
        intervalRef.current = setInterval(fetchSession, 5000);

        // Auto-stop after 2 minutes
        timeoutRef.current = setTimeout(() => {
          stopPolling();
          setExpired(true);
        }, QR_TIMEOUT_MS);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setLoading(false);
    }
  };

  const isConnected = session?.status === "WORKING";
  const hasQR = session?.status === "SCAN_QR_CODE" && session.qr?.data;

  const content = (
    <>
      {error && (
        <div className="mb-4 text-sm text-coral-600 bg-coral-50 rounded-xl px-4 py-3 border border-coral-100">
          {error}
        </div>
      )}

      {isConnected && (
        <div className="py-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center mx-auto mb-4 border border-sage-100">
            <svg className="w-6 h-6 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="font-medium text-stone-700">Connected</p>
          <p className="text-stone-400 text-sm mt-1">WhatsApp is linked and syncing.</p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={handleStart}
              disabled={loading}
              className="text-xs text-stone-400 hover:text-stone-600 bg-stone-50 hover:bg-stone-100 px-4 py-2 rounded-lg border border-stone-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Restarting..." : "Restart session"}
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await api.stopWAHASession();
                  await fetchSession();
                } finally { setLoading(false); }
              }}
              disabled={loading}
              className="text-xs text-coral-400 hover:text-coral-600 bg-coral-50 hover:bg-coral-100 px-4 py-2 rounded-lg border border-coral-100 transition-all cursor-pointer disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {polling && hasQR && (
        <div className="animate-fade-in">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Waiting for scan
            </span>
          </div>
          <p className="text-sm text-stone-500 mb-4">
            Open WhatsApp &rarr; Linked Devices &rarr; Link a Device
          </p>
          <div className="inline-block p-3 bg-white rounded-2xl border border-stone-200 shadow-sm">
            <img
              src={`data:${session!.qr!.mimetype};base64,${session!.qr!.data}`}
              alt="WhatsApp QR Code"
              className="w-56 h-56"
            />
          </div>
          <p className="text-[11px] text-stone-300 mt-4">
            QR expires in 2 minutes. Refreshes automatically.
          </p>
        </div>
      )}

      {loading && (
        <div className="py-8 animate-fade-in">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-400 text-sm">Starting session...</p>
        </div>
      )}

      {expired && (
        <div className="py-4 animate-fade-in">
          <p className="text-sm text-stone-500 mb-5">
            QR code expired. Click below to generate a new one.
          </p>
          <button
            onClick={handleStart}
            className="bg-stone-800 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-all cursor-pointer shadow-sm shadow-stone-800/10"
          >
            Try Again
          </button>
        </div>
      )}

      {initialLoading && (
        <div className="py-8">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-400 text-sm">Checking status...</p>
        </div>
      )}

      {!initialLoading && !isConnected && !polling && !loading && !expired && (
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
  );

  if (inline) {
    return <div className="text-center">{content}</div>;
  }

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
