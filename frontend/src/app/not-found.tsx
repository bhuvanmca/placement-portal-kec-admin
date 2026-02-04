'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="h-10 w-10 text-[#002147]" />
        </div>
        <h1 className="text-4xl font-bold text-[#002147] mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link href="/">
          <Button className="bg-[#002147] hover:bg-[#003366] text-white w-full sm:w-auto flex items-center gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
      <p className="mt-8 text-sm text-gray-400">KEC Placement Portal</p>
    </div>
  );
}
