import type { Expense, Settlement } from './types';

export type BalanceLineItem = {
  id: string;
  description: string;
  date: string;
  label: string;
  amountCents: number;
  kind: 'expense' | 'settlement';
};

export function buildUserLedger(
  userId: string,
  expenses: Expense[],
  settlements: Settlement[] = [],
): BalanceLineItem[] {
  const items: BalanceLineItem[] = [];

  for (const exp of expenses) {
    const split = exp.splits.find((s) => s.userId === userId);

    if (exp.paidById === userId) {
      items.push({
        id: `exp-pay-${exp.id}`,
        description: exp.description,
        date: exp.date,
        label: 'Paid',
        amountCents: exp.amountCents,
        kind: 'expense',
      });
    }

    if (split) {
      items.push({
        id: `exp-share-${exp.id}`,
        description: exp.description,
        date: exp.date,
        label:
          exp.paidById === userId
            ? 'Your share'
            : `Share (${exp.paidBy.name} paid)`,
        amountCents: -split.shareCents,
        kind: 'expense',
      });
    }
  }

  for (const s of settlements) {
    if (s.fromUserId === userId) {
      items.push({
        id: `settle-out-${s.id}`,
        description: s.note || `Paid ${s.toName}`,
        date: s.createdAt,
        label: `Settled with ${s.toName}`,
        amountCents: s.amountCents,
        kind: 'settlement',
      });
    }
    if (s.toUserId === userId) {
      items.push({
        id: `settle-in-${s.id}`,
        description: s.note || `Received from ${s.fromName}`,
        date: s.createdAt,
        label: `Received from ${s.fromName}`,
        amountCents: -s.amountCents,
        kind: 'settlement',
      });
    }
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
