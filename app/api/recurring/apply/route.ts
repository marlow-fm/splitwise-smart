import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { splitEqual } from '@/lib/money';
import { monthRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { recurringId } = await req.json();
    if (!recurringId) {
      return NextResponse.json({ error: 'recurringId required' }, { status: 400 });
    }

    const recurring = await db.recurringExpense.findUnique({
      where: { id: recurringId },
      include: { splits: true },
    });
    if (!recurring) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { start, end } = monthRange();
    const existing = await db.expense.findFirst({
      where: { recurringId, date: { gte: start, lte: end } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already logged this month' }, { status: 409 });
    }

    const participantIds = recurring.splits.map((s) => s.userId);
    const shares = splitEqual(recurring.amountCents, participantIds.length);
    const splits = participantIds.map((userId, i) => ({
      userId,
      shareCents: shares[i],
    }));

    const expense = await db.expense.create({
      data: {
        description: recurring.description,
        amountCents: recurring.amountCents,
        category: recurring.category,
        paidById: recurring.paidById,
        recurringId: recurring.id,
        splits: { create: splits },
      },
      include: {
        paidBy: true,
        splits: { include: { user: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error('POST /api/recurring/apply', e);
    return NextResponse.json({ error: 'Failed to apply recurring expense' }, { status: 500 });
  }
}
