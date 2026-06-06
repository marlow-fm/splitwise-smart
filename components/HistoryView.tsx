'use client';

import { useMemo, useState } from 'react';
import { useHouse } from '@/context/HouseContext';
import { formatMoney } from '@/lib/money';
import { formatShortDate } from '@/lib/dates';
import { CATEGORIES, categoryEmoji } from '@/lib/categories';
import HistoryExpenseEditor from '@/components/HistoryExpenseEditor';
import HistorySettlementEditor from '@/components/HistorySettlementEditor';
import type { Expense, Settlement } from '@/lib/types';

type HistoryItem =
  | { kind: 'expense'; id: string; date: string; data: Expense }
  | { kind: 'settlement'; id: string; date: string; data: Settlement };

type TypeFilter = 'all' | 'expenses' | 'settlements';

function groupByMonth(items: HistoryItem[]): [string, HistoryItem[]][] {
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const d = new Date(item.date);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  for (const [, list] of groups) {
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return [...groups.entries()];
}

export default function HistoryView() {
  const { users, expenses, balances, loading, refresh } = useHouse();
  const settlements = balances.settlements ?? [];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allItems = useMemo((): HistoryItem[] => {
    const expenseItems: HistoryItem[] = expenses.map((e) => ({
      kind: 'expense',
      id: e.id,
      date: e.date,
      data: e,
    }));
    const settlementItems: HistoryItem[] = settlements.map((s) => ({
      kind: 'settlement',
      id: s.id,
      date: s.createdAt,
      data: s,
    }));
    return [...expenseItems, ...settlementItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [expenses, settlements]);

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (typeFilter === 'expenses' && item.kind !== 'expense') return false;
      if (typeFilter === 'settlements' && item.kind !== 'settlement') return false;

      if (item.kind === 'expense') {
        if (category && item.data.category !== category) return false;
        if (search && !item.data.description.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
      } else {
        if (category) return false;
        const haystack = `${item.data.fromName} ${item.data.toName} ${item.data.note ?? ''}`.toLowerCase();
        if (search && !haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [allItems, search, category, typeFilter]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      setEditing(null);
    } else {
      setExpanded(id);
      setEditing(null);
    }
    setError('');
  }

  async function saveExpense(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setExpanded(null);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function saveSettlement(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setExpanded(null);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function removeExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    setBusy(true);
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
    setExpanded(null);
    setEditing(null);
    await refresh();
    setBusy(false);
  }

  async function removeSettlement(id: string) {
    if (!confirm('Delete this settlement? Balances will be restored.')) return;
    setBusy(true);
    await fetch(`/api/settlements?id=${id}`, { method: 'DELETE' });
    setExpanded(null);
    setEditing(null);
    await refresh();
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input flex-1"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-36"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
        >
          <option value="all">All</option>
          <option value="expenses">Expenses</option>
          <option value="settlements">Settlements</option>
        </select>
        <select
          className="input sm:w-40"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORIES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">Nothing matches your filters.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <section key={month}>
              <h3 className="text-sm font-semibold text-slate-500 mb-2">{month}</h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const isOpen = expanded === item.id;
                  const isEditing = editing === item.id;

                  if (item.kind === 'settlement') {
                    const s = item.data;
                    return (
                      <div
                        key={item.id}
                        className="card p-0 overflow-hidden border-green-100 bg-green-50/30"
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-green-50 transition-colors"
                          onClick={() => toggleExpand(item.id)}
                        >
                          <span className="text-xl">✓</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800">
                              {s.fromName}
                              <span className="text-slate-400 font-normal mx-1">paid</span>
                              {s.toName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatShortDate(s.createdAt)} · Settlement
                              {s.note && ` · ${s.note}`}
                            </p>
                          </div>
                          <p className="font-semibold text-green-700 shrink-0">
                            {formatMoney(s.amountCents)}
                          </p>
                          <span className="text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-green-100 pt-3">
                            {isEditing ? (
                              <HistorySettlementEditor
                                settlement={s}
                                users={users}
                                busy={busy}
                                onSave={saveSettlement}
                                onCancel={() => setEditing(null)}
                                onDelete={() => removeSettlement(s.id)}
                              />
                            ) : (
                              <>
                                <p className="text-sm text-slate-600 mb-3">
                                  {s.fromName} paid {s.toName}{' '}
                                  <strong>{formatMoney(s.amountCents)}</strong> to settle up.
                                </p>
                                <div className="flex gap-4">
                                  <button
                                    type="button"
                                    onClick={() => setEditing(item.id)}
                                    className="text-sm text-green-700 hover:text-green-900 font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeSettlement(s.id)}
                                    className="text-sm text-red-500 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const exp = item.data;
                  return (
                    <div key={item.id} className="card p-0 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <span className="text-xl">{categoryEmoji(exp.category)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{exp.description}</p>
                          <p className="text-xs text-slate-400">
                            {formatShortDate(exp.date)} · Paid by {exp.paidBy.name}
                            {exp.recurringId && ' · Recurring'}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-800 shrink-0">
                          {formatMoney(exp.amountCents)}
                        </p>
                        <span className="text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                          {isEditing ? (
                            <HistoryExpenseEditor
                              expense={exp}
                              users={users}
                              busy={busy}
                              onSave={saveExpense}
                              onCancel={() => setEditing(null)}
                              onDelete={() => removeExpense(exp.id)}
                            />
                          ) : (
                            <>
                              <p className="text-xs text-slate-500 mb-2">Split breakdown</p>
                              <ul className="space-y-1 mb-3">
                                {exp.splits.map((split) => (
                                  <li
                                    key={split.id}
                                    className="flex justify-between text-sm text-slate-600"
                                  >
                                    <span>{split.user.name}</span>
                                    <span>{formatMoney(split.shareCents)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={() => setEditing(item.id)}
                                  className="text-sm text-green-700 hover:text-green-900 font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeExpense(exp.id)}
                                  className="text-sm text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
