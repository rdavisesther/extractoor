import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'MailCMH - Email & DNS Tooling Dashboard',
  description: 'Professional email extraction and DNS lookup dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-60 min-h-screen p-6 transition-all duration-300">
          <div className="mx-auto max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
