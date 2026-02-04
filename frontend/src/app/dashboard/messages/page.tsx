'use client';

import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50/50">
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
          <MessageSquare size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Messages</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Communication center for student and company interactions. This module is under active development.
        </p>
      </div>
    </div>
  );
}
