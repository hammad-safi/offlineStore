import '@/styles/globals.css';
import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Shop ERP',
  description: 'Complete offline shop ERP progressive web app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Shop ERP" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="flex h-screen overflow-hidden bg-gray-50 text-slate-900">
        <Navbar />
        <main className="w-full flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
