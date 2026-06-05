'use client';
import { useState, useEffect } from 'react';
import ParsePreview from './ParsePreview';

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-100 text-orange-700',
  transport: 'bg-blue-100 text-blue-700',
  housing: 'bg-purple-100 text-purple-700',
  entertainment: 'bg-pink-100 text-pink-700',
  groceries: 'bg-green-100 text-green-700',
  health: 'bg-red-100 text-red-700',
  travel: 'bg-sky-100 text-sky-700',
  shopping: 'bg-yellow-100 text-yellow-700',
  general: 'bg-slate-100 text-slate-600',
};

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍕', transport: '🚗', housing: '🏠', entertainment: '🎬',
  groceries: '🛒', health: '💪', travel: '✈️', shopping: '🛍️', general: '💰',
};

export { CATEGORY_COLORS, CATEGORY_EMOJI };

interface Props { onSuccess: () => void; }

export default function SmartInput({ onSuccess }: Props) {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  async function handleParse() {
    if (!raw.trim()) return;
    setParsing(true);
    setError('');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: raw }),
      });
      const data = await res.json();
      setParsed(data);
    } catch {
      setError('Failed to parse. Try again.');
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(confirmed: any) {
    setSubmitting(true);
    setError('');
    try {
      // Resolve payer userId
      let paidById: string | null = null;
      if (confirmed.payer) {
        const match = users.find(
          (u) => u.name.toLowerCase() === confirmed.payer?.toLowerCase()
        );
        paidById = match?.id ?? null;
      }
      if (!paidById && users.length > 0) paidById = users[0].id;
      if (!paidById) {
        setError('Could not resolve payer. Please add users first.');
        setSubmitting(false);
        return;
      }

      // Build splits
      const participantUsers = confirmed.participants
        .map((name: string) => users.find((u) => u.name.toLowerCase() === name.toLowerCase()))
        .filter(Boolean);

      if (participantUsers.length === 0) participantUsers.push(users.find((u) => u.id === paidById));

      const shareAmount = confirmed.amount / participantUsers.length;
      const splits = participantUsers.map((u: any) => ({ userId: u.id, shareAmount }));

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: confirmed.description,
          amount: confirmed.amount,
          currency: confirmed.currency,
          category: confirmed.category,
          splitType: confirmed.splitType,
          date: confirmed.date,
          paidById,
          splits,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? 'Failed to save');
        return;
      }

      setRaw('');
      setParsed(null);
      onSuccess();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          className="smart-input flex-1"
          rows={2}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setParsed(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse(); } }}
          placeholder="Dinner 80 I paid, split with Alex and Jamie..."
        />
        <button
          onClick={handleParse}
          disabled={parsing || !raw.trim()}
          className="px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-40 transition-colors self-start mt-0 h-14 text-sm whitespace-nowrap"
        >
          {parsing ? 'Parsing...' : 'Parse ✨'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {parsed && (
        <ParsePreview
          parsed={parsed}
          users={users}
          onConfirm={handleSubmit}
          onCancel={() => setParsed(null)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
