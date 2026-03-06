"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

export function ConnectivityOverlay() {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="mx-8 max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <WifiOff className="h-12 w-12 text-red-500" />
                    <h2 className="mt-4 text-xl font-bold text-gray-900">
                        No Internet Connection
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please check your network settings and try again.
                    </p>
                </div>
            </div>
        </div>
    );
}
