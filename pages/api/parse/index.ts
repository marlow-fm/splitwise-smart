import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { parseInput } from '@/lib/parsing/parseInput';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { rawInput } = req.body;
  if (!rawInput) return res.status(400).json({ error: 'rawInput required' });

  const users = await db.user.findMany();
  const groups = await db.group.findMany();

  const parsed = parseInput(
    rawInput,
    users.map((u) => u.name),
    groups.map((g) => g.name)
  );

  return res.json(parsed);
}
