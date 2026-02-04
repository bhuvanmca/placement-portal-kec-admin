'use client';

import { BarChart2 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50/50">
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
          <BarChart2 size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Analytics</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Comprehensive placement insights and data visualization. Dashboard charts are coming soon.
        </p>
      </div>
    </div>
  );
}
