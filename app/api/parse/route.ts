import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { parseInput } from '@/lib/parsing/parseInput';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const users = await db.user.findMany({ orderBy: { name: 'asc' } });
    const parsed = parseInput(
      text.trim(),
      users.map((u) => u.name),
    );

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('POST /api/parse', e);
    return NextResponse.json({ error: 'Failed to parse' }, { status: 500 });
  }
}
