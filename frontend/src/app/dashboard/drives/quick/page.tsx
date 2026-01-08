'use client';

import { Zap } from 'lucide-react';

export default function QuickDrivesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50/50">
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-amber-100">
          <Zap size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Quick Drives</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Rapidly launch placement drives with pre-configured templates. This feature is coming soon.
        </p>
      </div>
    </div>
  );
}
