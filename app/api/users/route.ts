// app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const users = await db.user.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error('GET /api/users error', e);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('POST /api/users body', body);

    const name =
      typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim() : '';

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      );
    }

    const user = await db.user.create({
      data: { name, email },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/users error', e);

    // Optional: keep friendly handling for unique constraint violations.
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: e?.message ?? 'Failed to create user' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'ID required' },
      { status: 400 },
    );
  }

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/users error', e);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 },
    );
  }
}
