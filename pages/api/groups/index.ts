import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const groups = await db.group.findMany({
      include: { memberships: { include: { user: true } }, _count: { select: { expenses: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(groups);
  }
  if (req.method === 'POST') {
    const { name, emoji, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const group = await db.group.create({
      data: {
        name,
        emoji: emoji ?? '👥',
        memberships: memberIds?.length
          ? { create: memberIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
      },
      include: { memberships: { include: { user: true } } },
    });
    return res.status(201).json(group);
  }
  res.status(405).end();
}
