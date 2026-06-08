import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { dollarsToCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromUserId, toUserId, amount, note } = body;

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json(
        { error: 'fromUserId, toUserId, and amount are required' },
        { status: 400 },
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 });
    }

    const amountCents = dollarsToCents(Number(amount));
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const users = await db.user.findMany({
      where: { id: { in: [fromUserId, toUserId] } },
    });
    if (users.length !== 2) {
      return NextResponse.json({ error: 'Invalid users' }, { status: 400 });
    }

    const settlement = await db.settlement.create({
      data: {
        fromUserId,
        toUserId,
        amountCents,
        note: note?.trim() || null,
      },
      include: { fromUser: true, toUser: true },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (e) {
    console.error('POST /api/settlements', e);
    return NextResponse.json({ error: 'Failed to record settlement' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, fromUserId, toUserId, amount, note, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.settlement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const from = fromUserId ?? existing.fromUserId;
    const to = toUserId ?? existing.toUserId;
    if (from === to) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 });
    }

    const amountCents = amount != null ? dollarsToCents(Number(amount)) : existing.amountCents;
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const settlement = await db.settlement.update({
      where: { id },
      data: {
        fromUserId: from,
        toUserId: to,
        amountCents,
        ...(note !== undefined && { note: note?.trim() || null }),
        ...(date != null && { createdAt: new Date(date) }),
      },
      include: { fromUser: true, toUser: true },
    });

    return NextResponse.json(settlement);
  } catch (e) {
    console.error('PATCH /api/settlements', e);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await db.settlement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/settlements', e);
    return NextResponse.json({ error: 'Failed to undo settlement' }, { status: 500 });
  }
}
