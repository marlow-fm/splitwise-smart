import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SplitSmart',
  description: 'Smart expense splitting with one input',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-green-600">
              <span className="text-2xl">💚</span> SplitSmart
            </a>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <a href="/" className="hover:text-slate-900 transition-colors">Dashboard</a>
              <a href="/groups" className="hover:text-slate-900 transition-colors">Groups</a>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
