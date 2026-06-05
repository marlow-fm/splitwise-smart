import { NextRequest, NextResponse } from 'next';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId');
  const expenses = await db.expense.findMany({
    where: groupId ? { groupId } : {},
    include: { paidBy: true, splits: { include: { user: true } }, group: true },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, amount, currency, category, splitType, notes, date, groupId, paidById, splits } = body;
  if (!description || !amount || !paidById) {
    return NextResponse.json({ error: 'description, amount, paidById required' }, { status: 400 });
  }
  if (!splits || splits.length === 0) {
    return NextResponse.json({ error: 'splits required' }, { status: 400 });
  }
  const expense = await db.expense.create({
    data: {
      description,
      amount: parseFloat(amount),
      currency: currency ?? 'USD',
      category: category ?? 'general',
      splitType: splitType ?? 'equal',
      notes: notes ?? null,
      date: date ? new Date(date) : new Date(),
      groupId: groupId ?? null,
      paidById,
      splits: {
        create: splits.map((s: { userId: string; shareAmount: number }) => ({
          userId: s.userId,
          shareAmount: parseFloat(String(s.shareAmount)),
        })),
      },
    },
    include: { paidBy: true, splits: { include: { user: true } }, group: true },
  });
  return NextResponse.json(expense, { status: 201 });
}
