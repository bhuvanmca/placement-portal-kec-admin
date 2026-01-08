'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50/50">
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-200">
          <Settings size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Settings</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          System configuration and preferences. Manage your portal settings here in the future.
        </p>
      </div>
    </div>
  );
}
