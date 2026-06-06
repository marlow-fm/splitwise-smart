import type { Debt, NetBalance } from './types';

type ExpenseForBalance = {
  amountCents: number;
  paidById: string;
  paidBy: { id: string; name: string; color: string };
  splits: {
    userId: string;
    shareCents: number;
    user: { id: string; name: string; color: string };
  }[];
};

type SettlementForBalance = {
  amountCents: number;
  fromUserId: string;
  toUserId: string;
  fromUser: { id: string; name: string; color: string };
  toUser: { id: string; name: string; color: string };
};

export function computeBalances(
  expenses: ExpenseForBalance[],
  settlements: SettlementForBalance[] = [],
): {
  net: NetBalance[];
  debts: Debt[];
} {
  const netMap = new Map<string, NetBalance>();

  const ensure = (user: { id: string; name: string; color: string }) => {
    if (!netMap.has(user.id)) {
      netMap.set(user.id, {
        userId: user.id,
        name: user.name,
        color: user.color,
        netCents: 0,
      });
    }
    return netMap.get(user.id)!;
  };

  for (const expense of expenses) {
    ensure(expense.paidBy).netCents += expense.amountCents;
    for (const split of expense.splits) {
      ensure(split.user).netCents -= split.shareCents;
    }
  }

  for (const s of settlements) {
    ensure(s.fromUser).netCents += s.amountCents;
    ensure(s.toUser).netCents -= s.amountCents;
  }

  const creditors = [...netMap.values()]
    .filter((b) => b.netCents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.netCents - a.netCents);

  const debtors = [...netMap.values()]
    .filter((b) => b.netCents < 0)
    .map((b) => ({ ...b, netCents: -b.netCents }))
    .sort((a, b) => b.netCents - a.netCents);

  const debts: Debt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amountCents = Math.min(creditor.netCents, debtor.netCents);

    if (amountCents > 0) {
      debts.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        toId: creditor.userId,
        toName: creditor.name,
        amountCents,
      });
      creditor.netCents -= amountCents;
      debtor.netCents -= amountCents;
    }

    if (creditor.netCents === 0) ci++;
    if (debtor.netCents === 0) di++;
  }

  return { net: [...netMap.values()], debts };
}
