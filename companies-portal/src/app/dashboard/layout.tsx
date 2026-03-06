'use client';
import Header from '@/components/header';
import ProtectedRoute from '@/components/auth/protected-route';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <div className="flex flex-col h-screen bg-gray-50 font-sans">
                <Header />
                <main id="main-scroll-container" className="flex-1 overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
