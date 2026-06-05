'use client';
import { useState } from 'react';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from './SmartInput';

interface Props {
  parsed: any;
  users: any[];
  onConfirm: (data: any) => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function ParsePreview({ parsed, users, onConfirm, onCancel, submitting }: Props) {
  const [form, setForm] = useState({ ...parsed });

  function update(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  const catClass = CATEGORY_COLORS[form.category] ?? CATEGORY_COLORS.general;
  const catEmoji = CATEGORY_EMOJI[form.category] ?? '💰';

  return (
    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 space-y-3 animate-in">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-green-800 text-sm">Parsed — confirm or edit below</span>
        <span className={`category-chip ${catClass}`}>{catEmoji} {form.category}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Description */}
        <div className="col-span-2">
          <label className="block text-slate-500 mb-0.5 text-xs">Description</label>
          <input
            className="w-full border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-slate-500 mb-0.5 text-xs">Amount ({form.currency})</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={form.amount}
            onChange={(e) => update('amount', parseFloat(e.target.value))}
          />
        </div>

        {/* Split type */}
        <div>
          <label className="block text-slate-500 mb-0.5 text-xs">Split</label>
          <select
            className="w-full border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={form.splitType}
            onChange={(e) => update('splitType', e.target.value)}
          >
            <option value="equal">Equal</option>
            <option value="percentage">Percentage</option>
            <option value="exact">Exact</option>
            <option value="shares">Shares</option>
          </select>
        </div>

        {/* Payer */}
        <div>
          <label className="block text-slate-500 mb-0.5 text-xs">Paid by</label>
          <select
            className="w-full border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={form.payer ?? ''}
            onChange={(e) => update('payer', e.target.value)}
          >
            <option value="">-- select --</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-slate-500 mb-0.5 text-xs">Category</label>
          <select
            className="w-full border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {Object.keys(CATEGORY_COLORS).map((c) => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
            ))}
          </select>
        </div>

        {/* Participants */}
        <div className="col-span-2">
          <label className="block text-slate-500 mb-0.5 text-xs">Split with (comma-separated names)</label>
          <input
            className="w-full border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={form.participants?.join(', ') ?? ''}
            onChange={(e) => update('participants', e.target.value.split(',').map((p: string) => p.trim()).filter(Boolean))}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirm(form)}
          disabled={submitting}
          className="flex-1 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : '✓ Confirm & Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
