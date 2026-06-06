'use client';

import { useState } from 'react';
import { useHouse } from '@/context/HouseContext';
import { formatMoney, centsToDollars } from '@/lib/money';
import type { Debt } from '@/lib/types';

export default function SettleUpPanel() {
  const { users, balances, refresh } = useHouse();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  async function recordSettlement(
    fromUserId: string,
    toUserId: string,
    amountDollars: number,
    settlementNote?: string,
  ) {
    const res = await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUserId,
        toUserId,
        amount: amountDollars,
        note: settlementNote,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to record');
    await refresh();
  }

  async function settleDebt(debt: Debt) {
    const key = `${debt.fromId}-${debt.toId}`;
    setBusy(key);
    setError('');
    try {
      await recordSettlement(
        debt.fromId,
        debt.toId,
        centsToDollars(debt.amountCents),
        `${debt.fromName} paid ${debt.toName}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !toId || !amount) return;
    setBusy('manual');
    setError('');
    try {
      await recordSettlement(fromId, toId, parseFloat(amount), note.trim() || undefined);
      setFromId('');
      setToId('');
      setAmount('');
      setNote('');
      setShowManual(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const { debts } = balances;

  return (
    <section className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Settle up</h2>
          <p className="text-xs text-slate-400">
            Record when someone pays another person back to clear balances
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="text-sm text-green-600 hover:text-green-800 font-medium shrink-0"
        >
          {showManual ? 'Cancel' : '+ Manual'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {showManual && (
        <form
          onSubmit={handleManualSubmit}
          className="space-y-3 border border-slate-100 rounded-xl p-4 bg-slate-50"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500">Who paid?</span>
              <select
                className="input mt-1"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Paid to</span>
              <select
                className="input mt-1"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Amount ($)</span>
              <input
                className="input mt-1"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Note (optional)</span>
              <input
                className="input mt-1"
                placeholder="e.g. Venmo"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={busy === 'manual'} className="btn-primary w-full">
            {busy === 'manual' ? 'Recording…' : 'Record payment'}
          </button>
        </form>
      )}

      {debts.length === 0 ? (
        <p className="text-sm text-slate-500">All settled up — no payments needed.</p>
      ) : (
        <ul className="space-y-2">
          {debts.map((d) => {
            const key = `${d.fromId}-${d.toId}`;
            return (
              <li
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 rounded-xl px-3 py-3"
              >
                <div className="flex-1 text-sm">
                  <strong>{d.fromName}</strong>
                  <span className="text-slate-400 mx-1">owes</span>
                  <strong>{d.toName}</strong>
                  <span className="font-semibold text-red-600 ml-2">
                    {formatMoney(d.amountCents)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => settleDebt(d)}
                  disabled={busy === key}
                  className="btn-primary text-sm px-4 py-2 shrink-0"
                >
                  {busy === key ? '…' : 'Mark as paid'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
