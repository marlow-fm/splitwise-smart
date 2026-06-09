import type { Expense } from '@/lib/types';
import { CATEGORIES, categoryEmoji, categoryLabel } from '@/lib/categories';

export type AnalyticsView = 'monthly' | 'category' | 'payer' | 'share';

export type ChartBar = {
  id: string;
  label: string;
  sublabel?: string;
  valueCents: number;
  color?: string;
};

export function monthlySpending(expenses: Expense[], months = 8): ChartBar[] {
  const totals = new Map<string, number>();

  for (const exp of expenses) {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    totals.set(key, (totals.get(key) ?? 0) + exp.amountCents);
  }

  const sorted = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
  const recent = sorted.slice(-months);

  return recent.map(([key, valueCents]) => {
    const [year, month] = key.split('-').map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'short',
    });
    return { id: key, label, sublabel: String(year), valueCents };
  });
}

export function spendingByCategory(expenses: Expense[]): ChartBar[] {
  const totals = new Map<string, number>();

  for (const exp of expenses) {
    totals.set(exp.category, (totals.get(exp.category) ?? 0) + exp.amountCents);
  }

  return [...totals.entries()]
    .map(([category, valueCents]) => ({
      id: category,
      label: categoryLabel(category),
      sublabel: categoryEmoji(category),
      valueCents,
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
}

export function spendingByPayer(expenses: Expense[]): ChartBar[] {
  const totals = new Map<string, { name: string; color: string; cents: number }>();

  for (const exp of expenses) {
    const existing = totals.get(exp.paidById);
    if (existing) {
      existing.cents += exp.amountCents;
    } else {
      totals.set(exp.paidById, {
        name: exp.paidBy.name,
        color: exp.paidBy.color,
        cents: exp.amountCents,
      });
    }
  }

  return [...totals.entries()]
    .map(([id, { name, color, cents }]) => ({
      id,
      label: name,
      valueCents: cents,
      color,
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
}

export function spendingByShare(expenses: Expense[]): ChartBar[] {
  const totals = new Map<string, { name: string; color: string; cents: number }>();

  for (const exp of expenses) {
    for (const split of exp.splits) {
      const existing = totals.get(split.userId);
      if (existing) {
        existing.cents += split.shareCents;
      } else {
        totals.set(split.userId, {
          name: split.user.name,
          color: split.user.color,
          cents: split.shareCents,
        });
      }
    }
  }

  return [...totals.entries()]
    .map(([id, { name, color, cents }]) => ({
      id,
      label: name,
      valueCents: cents,
      color,
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
}

export function utilitiesMonthly(expenses: Expense[], months = 8): ChartBar[] {
  const utility = expenses.filter((e) => e.category === 'utilities');
  return monthlySpending(utility, months);
}

export function analyticsSummary(expenses: Expense[]) {
  const totalCents = expenses.reduce((s, e) => s + e.amountCents, 0);
  const monthly = monthlySpending(expenses, 12);
  const avgMonthCents =
    monthly.length > 0
      ? Math.round(monthly.reduce((s, m) => s + m.valueCents, 0) / monthly.length)
      : 0;
  const byCat = spendingByCategory(expenses);
  const topCategory = byCat[0]?.label ?? '—';

  return { totalCents, avgMonthCents, topCategory, monthCount: monthly.length };
}

export const VIEW_META: Record<
  AnalyticsView,
  { title: string; description: string; compute: (expenses: Expense[]) => ChartBar[] }
> = {
  monthly: {
    title: 'Monthly spending',
    description: 'Total house expenses per month',
    compute: (expenses) => monthlySpending(expenses),
  },
  category: {
    title: 'By category',
    description: 'Where the money went',
    compute: spendingByCategory,
  },
  payer: {
    title: 'Who paid',
    description: 'Total each person fronted on bills',
    compute: spendingByPayer,
  },
  share: {
    title: 'Cost per person',
    description: 'Each person’s share across all splits',
    compute: spendingByShare,
  },
};
