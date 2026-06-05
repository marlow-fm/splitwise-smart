import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const users = await db.user.findMany({ orderBy: { name: 'asc' } });
    return res.json(users);
  }
  if (req.method === 'POST') {
    const { name, email, color } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const user = await db.user.create({ data: { name, email, color: color ?? '#6366f1' } });
    return res.status(201).json(user);
  }
  res.status(405).end();
}
