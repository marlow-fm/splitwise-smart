import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { groupId } = req.query;
    const expenses = await db.expense.findMany({
      where: groupId ? { groupId: String(groupId) } : {},
      include: {
        paidBy: true,
        splits: { include: { user: true } },
        group: true,
      },
      orderBy: { date: 'desc' },
    });
    return res.json(expenses);
  }

  if (req.method === 'POST') {
    const { description, amount, currency, category, splitType, notes, date, groupId, paidById, splits } = req.body;
    if (!description || !amount || !paidById) {
      return res.status(400).json({ error: 'description, amount, paidById required' });
    }
    if (!splits || splits.length === 0) {
      return res.status(400).json({ error: 'splits required' });
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
    return res.status(201).json(expense);
  }

  res.status(405).end();
}
