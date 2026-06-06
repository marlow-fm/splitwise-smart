'use client';

import { useState } from 'react';
import type { Expense, User } from '@/lib/types';
import { CATEGORIES } from '@/lib/categories';
import { centsToDollars } from '@/lib/money';
import { toDateInputValue, dateFromDateInput } from '@/lib/dates';

type Props = {
  expense: Expense;
  users: User[];
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
};

export default function HistoryExpenseEditor({
  expense,
  users,
  busy,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(centsToDollars(expense.amountCents)));
  const [category, setCategory] = useState(expense.category);
  const [expenseDate, setExpenseDate] = useState(toDateInputValue(new Date(expense.date)));
  const [paidById, setPaidById] = useState(expense.paidById);
  const [participantIds, setParticipantIds] = useState(expense.splits.map((s) => s.userId));

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      id: expense.id,
      description,
      amount: parseFloat(amount),
      category,
      date: dateFromDateInput(expenseDate),
      paidById,
      participantIds,
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <label className="block text-sm">
        <span className="text-xs text-slate-500">Title</span>
        <input
          className="input mt-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
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
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Date</span>
          <input
            type="date"
            className="input mt-1"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Paid by</span>
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
        <span className="text-xs text-slate-500">Split between (equal)</span>
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

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy || participantIds.length === 0} className="btn-primary flex-1">
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
