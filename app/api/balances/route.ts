import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { computeBalances } from '@/lib/balances';
import { monthRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const [expenses, settlements] = await Promise.all([
      db.expense.findMany({
        include: {
          paidBy: true,
          splits: { include: { user: true } },
        },
      }),
      db.settlement.findMany({
        include: { fromUser: true, toUser: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const { start, end } = monthRange();
    const monthTotalCents = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      })
      .reduce((sum, e) => sum + e.amountCents, 0);

    const settlementList = settlements.map((s) => ({
      id: s.id,
      fromUserId: s.fromUserId,
      fromName: s.fromUser.name,
      toUserId: s.toUserId,
      toName: s.toUser.name,
      amountCents: s.amountCents,
      note: s.note,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ...computeBalances(expenses, settlements),
      monthTotalCents,
      settlements: settlementList,
    });
  } catch (e) {
    console.error('GET /api/balances', e);
    return NextResponse.json({ error: 'Failed to calculate balances' }, { status: 500 });
  }
}
