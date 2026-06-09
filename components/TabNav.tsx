'use client';

import type { Tab } from '@/lib/types';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'add', label: 'Add', icon: '➕' },
  { id: 'balances', label: 'Balances', icon: '⚖️' },
  { id: 'analytics', label: 'Stats', icon: '📊' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'people', label: 'People', icon: '👥' },
];

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export default function TabNav({ active, onChange }: Props) {
  return (
    <nav className="flex gap-1 p-1 bg-slate-100 rounded-xl">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
            active === tab.id
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
