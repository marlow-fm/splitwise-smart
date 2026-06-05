import { NextRequest, NextResponse } from 'next';
import db from '@/lib/db';
import { parseInput } from '@/lib/parsing/parseInput';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rawInput } = body;
  if (!rawInput) return NextResponse.json({ error: 'rawInput required' }, { status: 400 });
  try {
    const users = await db.user.findMany();
    const groups = await db.group.findMany();
    const parsed = parseInput(
      rawInput,
      users.map((u) => u.name),
      groups.map((g) => g.name)
    );
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[parse] error:', err);
    return NextResponse.json({ error: 'Failed to parse input. Make sure the database is set up.' }, { status: 500 });
  }
}
