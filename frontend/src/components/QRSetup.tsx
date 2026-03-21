import { useState, useEffect, useCallback } from "react";
import { api, type WAHASession } from "../api/client";

interface Props {
  onClose: () => void;
}

export function QRSetup({ onClose }: Props) {
  const [session, setSession] = useState<WAHASession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getWAHASession();
      setSession(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    // Refresh every 5 seconds to get updated QR / status
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await api.startWAHASession();
      // Wait a moment then refresh
      setTimeout(fetchSession, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 max-w-[90vw]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">WhatsApp Connection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-6 text-center">
          {loading && !session && (
            <p className="text-gray-400">Loading session status...</p>
          )}

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          {session && (
            <>
              <div className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    session.status === "WORKING"
                      ? "bg-green-100 text-green-800"
                      : session.status === "SCAN_QR_CODE"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {session.status}
                </span>
              </div>

              {session.status === "WORKING" && (
                <p className="text-green-600 font-medium">
                  WhatsApp is connected and working!
                </p>
              )}

              {session.status === "SCAN_QR_CODE" && session.qr?.data && (
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Scan this QR code with WhatsApp on your phone:
                  </p>
                  <img
                    src={`data:${session.qr.mimetype};base64,${session.qr.data}`}
                    alt="WhatsApp QR Code"
                    className="mx-auto w-64 h-64"
                  />
                  <p className="text-xs text-gray-400 mt-3">
                    QR code refreshes automatically every 5 seconds.
                  </p>
                </div>
              )}

              {session.status === "STOPPED" && (
                <div>
                  <p className="text-sm text-gray-500 mb-4">
                    Session is stopped. Start it to generate a QR code.
                  </p>
                  <button
                    onClick={handleStart}
                    className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Start Session
                  </button>
                </div>
              )}

              {!["WORKING", "SCAN_QR_CODE", "STOPPED"].includes(session.status) && (
                <div>
                  <p className="text-sm text-gray-500 mb-4">
                    Session status: {session.status}. Try starting a new session.
                  </p>
                  <button
                    onClick={handleStart}
                    className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Start Session
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
