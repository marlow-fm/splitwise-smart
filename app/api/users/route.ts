import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { pickColor } from '@/lib/users';

export async function GET() {
  try {
    const users = await db.user.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(users);
  } catch (e) {
    console.error('GET /api/users', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const count = await db.user.count();
    const user = await db.user.create({
      data: { name: trimmed, color: pickColor(count) },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Someone with that name already exists' }, { status: 409 });
    }
    console.error('POST /api/users', e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/users', e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
