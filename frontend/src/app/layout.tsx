import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/layout/Sidebar';
import { NavigationProvider } from '../context/NavigationContext';

export const metadata: Metadata = {
  title: 'ReLife AI — Intelligent Product Recovery Platform',
  description: 'AI-powered product recovery decision platform for returned electronics. Optimizing circular economic pathways and diverting e-waste.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F4F7F5] text-slate-800 flex min-h-screen antialiased font-sans">
        <NavigationProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {children}
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}
