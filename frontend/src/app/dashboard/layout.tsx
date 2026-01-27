'use client';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import ProtectedRoute from '@/components/auth/protected-route';

import { FormProvider } from '@/context/form-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <FormProvider>
        <div className="flex h-screen bg-gray-50 font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main id="main-scroll-container" className="flex-1 overflow-y-auto bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </FormProvider>
    </ProtectedRoute>
  );
}
