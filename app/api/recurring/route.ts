import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { dollarsToCents } from '@/lib/money';
import { monthRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const recurring = await db.recurringExpense.findMany({
      include: {
        paidBy: true,
        splits: { include: { user: true } },
      },
      orderBy: { description: 'asc' },
    });

    const { start, end } = monthRange();
    const applied = await db.expense.findMany({
      where: {
        recurringId: { in: recurring.map((r) => r.id) },
        date: { gte: start, lte: end },
      },
      select: { recurringId: true },
    });
    const appliedSet = new Set(applied.map((e) => e.recurringId));

    const result = recurring.map((r) => ({
      id: r.id,
      description: r.description,
      amountCents: r.amountCents,
      category: r.category,
      paidById: r.paidById,
      paidBy: r.paidBy,
      splits: r.splits.map((s) => ({ userId: s.userId, user: s.user })),
      appliedThisMonth: appliedSet.has(r.id),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/recurring', e);
    return NextResponse.json({ error: 'Failed to fetch recurring' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, amount, category, paidById, participantIds } = body;

    if (!description?.trim() || !amount || !paidById) {
      return NextResponse.json({ error: 'description, amount, and paidById required' }, { status: 400 });
    }

    const ids: string[] = Array.isArray(participantIds) ? participantIds : [];
    const uniqueIds = [...new Set([paidById, ...ids])];
    const amountCents = dollarsToCents(Number(amount));

    const recurring = await db.recurringExpense.create({
      data: {
        description: description.trim(),
        amountCents,
        category: category ?? 'general',
        paidById,
        splits: {
          create: uniqueIds.map((userId) => ({ userId })),
        },
      },
      include: {
        paidBy: true,
        splits: { include: { user: true } },
      },
    });

    return NextResponse.json(recurring, { status: 201 });
  } catch (e) {
    console.error('POST /api/recurring', e);
    return NextResponse.json({ error: 'Failed to create recurring expense' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await db.recurringExpense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/recurring', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
