'use client';

import { useState } from 'react';
import type { Settlement, User } from '@/lib/types';
import { centsToDollars } from '@/lib/money';
import { toDateInputValue, dateFromDateInput } from '@/lib/dates';

type Props = {
  settlement: Settlement;
  users: User[];
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
};

export default function HistorySettlementEditor({
  settlement,
  users,
  busy,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [fromUserId, setFromUserId] = useState(settlement.fromUserId);
  const [toUserId, setToUserId] = useState(settlement.toUserId);
  const [amount, setAmount] = useState(String(centsToDollars(settlement.amountCents)));
  const [note, setNote] = useState(settlement.note ?? '');
  const [expenseDate, setExpenseDate] = useState(
    toDateInputValue(new Date(settlement.createdAt)),
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      id: settlement.id,
      fromUserId,
      toUserId,
      amount: parseFloat(amount),
      note,
      date: dateFromDateInput(expenseDate),
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Who paid</span>
          <select
            className="input mt-1"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Paid to</span>
          <select
            className="input mt-1"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
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
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Date</span>
          <input
            type="date"
            className="input mt-1"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-slate-500">Note</span>
        <input
          className="input mt-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy} className="btn-primary flex-1">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2">
          Cancel
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-500 hover:text-red-700 px-2"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
