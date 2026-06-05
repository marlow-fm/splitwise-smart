import { NextResponse } from 'next';
import db from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const groupId = url.searchParams.get('groupId');
  const expenses = await db.expense.findMany({
    where: groupId ? { groupId } : {},
    include: { paidBy: true, splits: { include: { user: true } } },
  });

  const net: Record<string, { userId: string; name: string; color: string; net: number }> = {};

  for (const expense of expenses) {
    const payerId = expense.paidById;
    if (!net[payerId]) net[payerId] = { userId: payerId, name: expense.paidBy.name, color: expense.paidBy.color, net: 0 };
    net[payerId].net += expense.amount;
    for (const split of expense.splits) {
      const uid = split.userId;
      if (!net[uid]) net[uid] = { userId: uid, name: split.user.name, color: split.user.color, net: 0 };
      if (!split.settled) net[uid].net -= split.shareAmount;
    }
  }

  const balances = Object.values(net);
  const debts: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];
  const creditors = balances.filter((b) => b.net > 0.01).sort((a, b) => b.net - a.net);
  const debtors = balances.filter((b) => b.net < -0.01).sort((a, b) => a.net - b.net);

  let ci = 0; let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]; const debt = debtors[di];
    const amount = Math.min(credit.net, -debt.net);
    debts.push({ from: debt.userId, fromName: debt.name, to: credit.userId, toName: credit.name, amount: Math.round(amount * 100) / 100 });
    credit.net -= amount; debt.net += amount;
    if (credit.net < 0.01) ci++;
    if (debt.net > -0.01) di++;
  }

  return NextResponse.json({ net: Object.values(net), debts });
}
