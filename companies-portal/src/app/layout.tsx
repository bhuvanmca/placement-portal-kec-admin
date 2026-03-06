import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "sonner";
import { ConnectivityOverlay } from "@/components/connectivity-overlay";
import { ServerErrorOverlay } from "@/components/server-error-overlay";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "KEC Companies Portal - Placement Cell",
    description: "Company Management Portal for KEC Placement Cell. Track visiting companies, manage recruitment details, and monitor readiness checklists.",
    keywords: ["KEC", "placement", "companies", "recruitment", "portal"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <AuthProvider>
                    {children}
                    <Toaster richColors position="top-center" />
                    <ConnectivityOverlay />
                    <ServerErrorOverlay />
                </AuthProvider>
            </body>
        </html>
    );
}
