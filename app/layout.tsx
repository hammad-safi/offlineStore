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
        <meta name="theme-color" content="#3b82f6" />
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
