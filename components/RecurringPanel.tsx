'use client';

import { useState } from 'react';
import { useHouse } from '@/context/HouseContext';
import { formatMoney } from '@/lib/money';
import { monthLabel } from '@/lib/dates';
import { CATEGORIES, categoryEmoji } from '@/lib/categories';

export default function RecurringPanel() {
  const { users, meId, recurring, refresh } = useHouse();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('utilities');
  const [paidById, setPaidById] = useState(meId ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>(users.map((u) => u.id));

  async function applyRecurring(id: string) {
    setBusy(id);
    setError('');
    try {
      const res = await fetch('/api/recurring/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurringId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to log');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function createRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || !paidById) return;
    setBusy('create');
    setError('');
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount),
          category,
          paidById,
          participantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');
      setDescription('');
      setAmount('');
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function removeRecurring(id: string) {
    if (!confirm('Remove this recurring bill?')) return;
    await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
    await refresh();
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  if (users.length === 0) return null;

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Monthly bills</h2>
          <p className="text-xs text-slate-500">One tap to log wifi, rent, etc. each month</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-green-600 hover:text-green-800 font-medium"
        >
          {showForm ? 'Cancel' : '+ Add bill'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={createRecurring} className="space-y-3 border border-slate-100 rounded-xl p-4 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-xs text-slate-500">Bill name</span>
              <input
                className="input mt-1"
                placeholder="e.g. Wifi, Rent, Electric"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Amount ($)</span>
              <input
                className="input mt-1"
                type="number"
                step="0.01"
                min="0"
                placeholder="67.00"
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
            <label className="block sm:col-span-2">
              <span className="text-xs text-slate-500">Usually paid by</span>
              <select
                className="input mt-1"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
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
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleParticipant(u.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    participantIds.includes(u.id)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={busy === 'create'} className="btn-primary w-full">
            {busy === 'create' ? 'Saving…' : 'Save recurring bill'}
          </button>
        </form>
      )}

      {recurring.length === 0 ? (
        <p className="text-sm text-slate-500">
          No recurring bills yet. Add wifi, rent, or utilities for quick monthly logging.
        </p>
      ) : (
        <ul className="space-y-2">
          {recurring.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-3"
            >
              <span className="text-xl">{categoryEmoji(r.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{r.description}</p>
                <p className="text-xs text-slate-400">
                  {formatMoney(r.amountCents)} · {r.paidBy.name} · {r.splits.length} people
                </p>
              </div>
              {r.appliedThisMonth ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">
                  ✓ {monthLabel().split(' ')[0]}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => applyRecurring(r.id)}
                  disabled={busy === r.id}
                  className="btn-primary text-sm px-3 py-1.5 shrink-0"
                >
                  {busy === r.id ? '…' : `Log ${monthLabel().split(' ')[0]}`}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeRecurring(r.id)}
                className="text-slate-400 hover:text-red-500 text-xs shrink-0"
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
