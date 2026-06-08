import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { dollarsToCents, splitEqual } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category');

    const expenses = await db.expense.findMany({
      where: category ? { category } : undefined,
      include: {
        paidBy: true,
        splits: { include: { user: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
    return NextResponse.json(expenses);
  } catch (e) {
    console.error('GET /api/expenses', e);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, amount, paidById, participantIds, category, date, recurringId } = body;

    if (!description?.trim() || !amount || !paidById) {
      return NextResponse.json(
        { error: 'description, amount, and paidById are required' },
        { status: 400 },
      );
    }

    const ids: string[] = Array.isArray(participantIds) ? participantIds : [];
    const uniqueIds = [...new Set([paidById, ...ids])];

    const users = await db.user.findMany({
      where: { id: { in: uniqueIds } },
    });
    if (users.length !== uniqueIds.length) {
      return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
    }

    const amountCents = dollarsToCents(Number(amount));
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const shares = splitEqual(amountCents, uniqueIds.length);
    const splits = uniqueIds.map((userId, i) => ({
      userId,
      shareCents: shares[i],
    }));

    const expense = await db.expense.create({
      data: {
        description: description.trim(),
        amountCents,
        category: category ?? 'general',
        date: date ? new Date(date) : new Date(),
        paidById,
        recurringId: recurringId ?? null,
        splits: { create: splits },
      },
      include: {
        paidBy: true,
        splits: { include: { user: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error('POST /api/expenses', e);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, description, amount, paidById, participantIds, category, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const amountCents = amount != null ? dollarsToCents(Number(amount)) : existing.amountCents;
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const paidBy = paidById ?? existing.paidById;
    const ids: string[] = Array.isArray(participantIds) ? participantIds : [];
    const uniqueIds = ids.length > 0 ? [...new Set([paidBy, ...ids])] : null;

    if (uniqueIds) {
      const users = await db.user.findMany({ where: { id: { in: uniqueIds } } });
      if (users.length !== uniqueIds.length) {
        return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
      }
    }

    const expense = await db.$transaction(async (tx) => {
      if (uniqueIds) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        const shares = splitEqual(amountCents, uniqueIds.length);
        await tx.expenseSplit.createMany({
          data: uniqueIds.map((userId, i) => ({
            expenseId: id,
            userId,
            shareCents: shares[i],
          })),
        });
      } else if (amount != null && amountCents !== existing.amountCents) {
        const splits = await tx.expenseSplit.findMany({ where: { expenseId: id } });
        const shares = splitEqual(amountCents, splits.length);
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        await tx.expenseSplit.createMany({
          data: splits.map((s, i) => ({
            expenseId: id,
            userId: s.userId,
            shareCents: shares[i],
          })),
        });
      }

      return tx.expense.update({
        where: { id },
        data: {
          ...(description != null && { description: String(description).trim() }),
          ...(amount != null && { amountCents }),
          ...(category != null && { category }),
          ...(date != null && { date: new Date(date) }),
          ...(paidById != null && { paidById }),
        },
        include: {
          paidBy: true,
          splits: { include: { user: true } },
        },
      });
    });

    return NextResponse.json(expense);
  } catch (e) {
    console.error('PATCH /api/expenses', e);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/expenses', e);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
