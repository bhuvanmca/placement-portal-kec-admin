"use client";

import { useEffect, useState } from "react";
import { ServerCrash, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export function ServerErrorOverlay() {
    const [isServerDown, setIsServerDown] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

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
                handleServerStatus
            );
        };
    }, []);

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            await api.get('/health');
            setIsServerDown(false);
            window.dispatchEvent(
                new CustomEvent("server-availability-changed", {
                    detail: { available: true },
                })
            );
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } finally {
            setIsRetrying(false);
        }
    };

    if (!isServerDown) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-8 max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 rounded-full bg-red-100 p-4">
                        <ServerCrash className="h-12 w-12 text-red-600" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold text-gray-900">
                        Server Unavailable
                    </h2>
                    <p className="mb-8 text-gray-600 leading-relaxed">
                        We&apos;re having trouble connecting to the server. It might be down for maintenance or experiencing issues.
                    </p>
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
