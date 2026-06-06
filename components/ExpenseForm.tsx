'use client';

import { useEffect, useState } from 'react';
import { useHouse } from '@/context/HouseContext';
import { CATEGORIES } from '@/lib/categories';
import { toDateInputValue, dateFromDateInput, formatShortDate } from '@/lib/dates';

export default function ExpenseForm() {
  const { users, meId, refresh } = useHouse();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [expenseDate, setExpenseDate] = useState(() => toDateInputValue(new Date()));
  const [paidById, setPaidById] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (meId) setPaidById(meId);
  }, [meId]);

  useEffect(() => {
    setParticipantIds(users.map((u) => u.id));
  }, [users]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount || !paidById || participantIds.length === 0) return;

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: title.trim(),
          amount: parseFloat(amount),
          category,
          paidById,
          participantIds,
          date: dateFromDateInput(expenseDate),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');

      setTitle('');
      setAmount('');
      setCategory('general');
      setExpenseDate(toDateInputValue(new Date()));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <section className="card space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Add expense</h1>
        <p className="text-sm text-slate-500 mt-1">
          Fill in the details below — same fields you can edit in History.
        </p>
      </div>

      {!meId && users.length > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Select who you are on the People tab so &ldquo;Paid by&rdquo; defaults to you.
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-slate-500">Add your housemates on the People tab first.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-500">Title</span>
            <input
              className="input mt-1"
              placeholder="e.g. March electric, Wifi, Groceries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500">Amount ($)</span>
              <input
                className="input mt-1"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="531.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Category</span>
              <select
                className="input mt-1"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(CATEGORIES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Date (shows in history)</span>
              <input
                type="date"
                className="input mt-1"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
              {expenseDate && (
                <span className="text-xs text-slate-400 mt-0.5 block">
                  {formatShortDate(dateFromDateInput(expenseDate))}
                </span>
              )}
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Paid by</span>
              <select
                className="input mt-1"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs text-slate-500">Split between</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {users.map((u) => {
                const on = participantIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleParticipant(u.id)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      on
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || participantIds.length === 0} className="btn-primary w-full">
            {busy ? 'Saving…' : 'Save expense'}
          </button>
        </form>
      )}
    </section>
  );
}
