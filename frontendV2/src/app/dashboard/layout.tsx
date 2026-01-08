'use client';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

import { FormProvider } from '@/context/form-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FormProvider>
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </FormProvider>
  );
}
