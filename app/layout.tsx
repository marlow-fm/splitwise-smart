import type { Metadata } from 'next';
import { HouseProvider } from '@/context/HouseContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'House Expenses',
  description: 'Track shared house expenses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <HouseProvider>
          <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
            <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
              <span className="font-bold text-lg text-green-600">House Expenses</span>
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
        </HouseProvider>
      </body>
    </html>
  );
}
