import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json(users);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    try {
      const user = await prisma.user.create({ data: { name: name.trim() } });
      return res.status(201).json(user);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ error: 'User already exists' });
      }
      console.error(e);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    try {
      await prisma.user.delete({ where: { id: String(id) } });
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
