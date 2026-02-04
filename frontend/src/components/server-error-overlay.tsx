"use client";

import { useEffect, useState } from "react";
import { ServerCrash, RefreshCw } from "lucide-react";
import api from "@/lib/api";

/**
 * ServerErrorOverlay component
 * Shows a full-screen blocking overlay when the backend server is unreachable
 * Listens for 'server-availability-changed' event dispatched by api.ts
 */
export function ServerErrorOverlay() {
  const [isServerDown, setIsServerDown] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Handler for custom server availability event
    const handleServerStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ available: boolean }>;
      if (customEvent.detail && !customEvent.detail.available) {
        setIsServerDown(true);
      } else if (customEvent.detail && customEvent.detail.available) {
        setIsServerDown(false);
      }
    };

    // Listen for the custom event
    window.addEventListener("server-availability-changed", handleServerStatus);

    return () => {
      window.removeEventListener(
        "server-availability-changed",
        handleServerStatus
      );
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Attempt a simple health check or root request
      // We use a direct fetch to avoid triggering the interceptor loop again immediately
      // or we can use the api instance but handle the error specifically.
      // Let's use api.get('/') - if it succeeds, the interceptor won't fire the error event (hopefully)
      // Actually, we should manually emit 'available: true' if it succeeds.
      
      await api.get('/health'); // Assuming a health endpoint exists, or just root
      
      // If we reach here, server is back!
      setIsServerDown(false);
      
      // Optional: Dispatch event to let other parts know? 
      // Not strictly necessary as this component controls its own state,
      // but good for consistency.
      window.dispatchEvent(
        new CustomEvent("server-availability-changed", {
          detail: { available: true },
        })
      );
    } catch (error) {
      // Still down, keep showing overlay
      // Artificial delay to show "checking..." state
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setIsRetrying(false);
    }
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
            We're having trouble connecting to the server. It might be down for maintenance or experiencing issues.
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
