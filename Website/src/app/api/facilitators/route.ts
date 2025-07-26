import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith('/roles')) {
    // Return available facilitator roles
    return NextResponse.json([
      { value: 'facilitator1', label: 'Attendance Facilitator' },
      { value: 'facilitator2', label: 'Education Facilitator' }
    ]);
  }
  try {
    const db = await getDb();
    const facilitators = await db
      .collection('users')
      .find({ role: { $in: ['facilitator1', 'facilitator2'] } })
      .project({ password: 0 }) // Exclude password
      .toArray();
    return NextResponse.json(facilitators, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { name, email, password, role } = await req.json();
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({ name, email, password: hashed, role });
    return NextResponse.json({ _id: result.insertedId, name, email, role }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const { id, name, email, password, role } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const update: any = { name, email, role };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }
    await db.collection('users').updateOne({ _id: new (await import('mongodb')).ObjectId(id) }, { $set: update });
    return NextResponse.json({ message: 'Facilitator updated' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    await db.collection('users').deleteOne({ _id: new (await import('mongodb')).ObjectId(id) });
    return NextResponse.json({ message: 'Facilitator deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 