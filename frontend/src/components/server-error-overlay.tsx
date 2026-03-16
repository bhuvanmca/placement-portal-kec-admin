"use client";

import { useEffect, useState, useRef } from "react";
import { ServerCrash, RefreshCw } from "lucide-react";
import { APP_CONFIG } from "@/constants/config";

/**
 * ServerErrorOverlay component
 * Shows a full-screen blocking overlay when the backend server is unreachable
 * Listens for 'server-availability-changed' event dispatched by api.ts
 * Auto-retries every 2 minutes and auto-dismisses when server comes back.
 * Uses a direct fetch to the Caddy gateway health endpoint to avoid
 * triggering axios interceptors and adding load to backend services.
 */
export function ServerErrorOverlay() {
  const [isServerDown, setIsServerDown] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const autoRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkServer = async () => {
    setIsRetrying(true);
    try {
      // Direct fetch to Caddy gateway — bypasses axios interceptor, no backend load
      const res = await fetch(`${APP_CONFIG.API_BASE_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setIsServerDown(false);
        window.dispatchEvent(
          new CustomEvent("server-availability-changed", {
            detail: { available: true },
          }),
        );
      }
    } catch {
      // Still down
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    const handleServerStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ available: boolean }>;
      if (customEvent.detail && !customEvent.detail.available) {
        setIsServerDown(true);
      } else if (customEvent.detail && customEvent.detail.available) {
        setIsServerDown(false);
      }
    };

    window.addEventListener("server-availability-changed", handleServerStatus);
    return () => {
      window.removeEventListener(
        "server-availability-changed",
        handleServerStatus,
      );
    };
  }, []);

  // Auto-retry every 2 minutes while overlay is visible
  useEffect(() => {
    if (isServerDown) {
      autoRetryRef.current = setInterval(checkServer, 120_000);
    } else {
      if (autoRetryRef.current) {
        clearInterval(autoRetryRef.current);
        autoRetryRef.current = null;
      }
    }
    return () => {
      if (autoRetryRef.current) {
        clearInterval(autoRetryRef.current);
        autoRetryRef.current = null;
      }
    };
  }, [isServerDown]);

  const handleRetry = () => {
    checkServer();
  };

  // Don't render anything if server is up
  if (!isServerDown) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-8 max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          {/* Server Crash Icon */}
          <div className="mb-6 rounded-full bg-red-100 p-4">
            <ServerCrash className="h-12 w-12 text-red-600" />
          </div>

          {/* Heading */}
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            Server Unavailable
          </h2>

          {/* Message */}
          <p className="mb-8 text-gray-600 leading-relaxed">
            We're having trouble connecting to the server. It might be down for
            maintenance or experiencing issues.
          </p>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="group flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed w-full"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRetrying ? "animate-spin" : ""}`}
            />
            {isRetrying ? "Checking connection..." : "Retry Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
