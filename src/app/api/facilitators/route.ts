import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { UserRole } from '@/lib/models';

const ROLE_VALUES: { value: UserRole; label: string }[] = [
  { value: 'Attendance Facilitator', label: 'Attendance Facilitator' },
  { value: 'Education Facilitator', label: 'Education Facilitator' },
];

export async function GET(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith('/roles')) {
    return NextResponse.json(ROLE_VALUES, { status: 200 });
  }
  try {
    const db = await getDb();
    const facilitators = await db
      .collection('users')
      .find({ role: { $in: ['Attendance Facilitator', 'Education Facilitator'] } })
      .project({ password: 0 }) // Exclude password
      .toArray();
    // Transform _id to string
    const transformedFacilitators = facilitators.map((fac) => ({
      ...fac,
      _id: fac._id.toString(),
    }));
    return NextResponse.json(transformedFacilitators, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch facilitators' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { name, email, password, role } = await req.json();
    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields: email, password, and role are required' }, { status: 400 });
    }
    // Validate role
    if (!ROLE_VALUES.some((r) => r.value === role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${ROLE_VALUES.map((r) => r.value).join(', ')}` }, { status: 400 });
    }
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({ name, email, password: hashed, role });
    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        email,
        role,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create facilitator' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const { id, name, email, password, role } = await req.json();
    // Validate required fields
    if (!id || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields: id, email, and role are required' }, { status: 400 });
    }
    // Validate role
    if (!ROLE_VALUES.some((r) => r.value === role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${ROLE_VALUES.map((r) => r.value).join(', ')}` }, { status: 400 });
    }
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid facilitator ID' }, { status: 400 });
    }
    const update: { name?: string; email: string; role: string; password?: string } = { name, email, role };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Facilitator updated' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update facilitator' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { id } = await req.json();
    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: 'Missing facilitator ID' }, { status: 400 });
    }
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid facilitator ID' }, { status: 400 });
    }
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Facilitator deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete facilitator' }, { status: 500 });
  }
}