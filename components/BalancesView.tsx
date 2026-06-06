'use client';

import { useMemo, useState } from 'react';
import { useHouse } from '@/context/HouseContext';
import { formatMoney } from '@/lib/money';
import { monthLabel, formatShortDate } from '@/lib/dates';
import { buildUserLedger } from '@/lib/ledger';
import { categoryEmoji } from '@/lib/categories';
import SettleUpPanel from '@/components/SettleUpPanel';

function balanceLabel(cents: number): { text: string; className: string } {
  if (cents > 0) return { text: `gets back ${formatMoney(cents)}`, className: 'text-green-600' };
  if (cents < 0) return { text: `owes ${formatMoney(-cents)}`, className: 'text-red-600' };
  return { text: 'settled up', className: 'text-slate-400' };
}

export default function BalancesView() {
  const { users, balances, expenses, meId, loading } = useHouse();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ledgers = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildUserLedger>>();
    for (const u of users) {
      map.set(u.id, buildUserLedger(u.id, expenses, balances.settlements ?? []));
    }
    return map;
  }, [users, expenses, balances.settlements]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="card h-20 animate-pulse bg-slate-50" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  const netByUser = new Map(balances.net.map((b) => [b.userId, b.netCents]));
  const allBalances = users.map((u) => ({
    ...u,
    netCents: netByUser.get(u.id) ?? 0,
  }));

  const myBalance = meId ? netByUser.get(meId) ?? 0 : null;

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-br from-green-50 to-white border-green-100">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{monthLabel()} house spend</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">
          {formatMoney(balances.monthTotalCents)}
        </p>
        {myBalance !== null && myBalance !== 0 && (
          <p className={`text-sm mt-2 ${myBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
            Your balance:{' '}
            {myBalance > 0
              ? `you are owed ${formatMoney(myBalance)}`
              : `you owe ${formatMoney(-myBalance)}`}
          </p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-800">Everyone&apos;s balance</h2>
        <p className="text-xs text-slate-400">Tap a name to see what&apos;s affecting their balance</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allBalances.map((u) => {
            const { text, className } = balanceLabel(u.netCents);
            const isMe = u.id === meId;
            const isOpen = expandedId === u.id;
            const ledger = ledgers.get(u.id) ?? [];

            return (
              <div
                key={u.id}
                className={`card p-0 overflow-hidden ${isMe ? 'ring-2 ring-green-300' : ''}`}
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : u.id)}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name[0]?.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">
                      {u.name}
                      {isMe && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    <p className={`text-sm font-medium ${className}`}>{text}</p>
                  </div>
                  <span className="text-slate-300 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {ledger.length === 0 ? (
                      <p className="text-sm text-slate-400">No expenses yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {ledger.map((item) => {
                          const exp =
                            item.kind === 'expense'
                              ? expenses.find((e) => item.id.includes(e.id))
                              : undefined;
                          return (
                            <li
                              key={item.id}
                              className="flex items-start gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2"
                            >
                              <span className="text-base shrink-0">
                                {item.kind === 'settlement' ? '✓' : categoryEmoji(exp?.category ?? 'general')}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-700 truncate">
                                  {item.description}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {formatShortDate(item.date)} · {item.label}
                                </p>
                              </div>
                              <span
                                className={`font-semibold shrink-0 ${
                                  item.amountCents >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {item.amountCents >= 0 ? '+' : ''}
                                {formatMoney(item.amountCents)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100 flex justify-between">
                      <span>Net balance</span>
                      <span className={`font-semibold ${className}`}>
                        {u.netCents >= 0 ? '+' : ''}
                        {formatMoney(u.netCents)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <SettleUpPanel />
    </div>
  );
}
