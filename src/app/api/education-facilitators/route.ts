// src/app/api/education-facilitators/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';

const EDUCATION_FACILITATOR_ROLE = 'Education Facilitator';

async function getRequesterRole(req: NextRequest): Promise<string> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return String(token?.role || '');
}

function canManageEducationFacilitators(role: string): boolean {
  return role === 'Education Admin' || role === 'Super Admin';
}

export async function GET(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageEducationFacilitators(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Invalid facilitator ID' }, { status: 400 });
      }

      const facilitator = await db
        .collection('users')
        .findOne(
          { _id: new ObjectId(id), role: EDUCATION_FACILITATOR_ROLE },
          { projection: { password: 0 } }
        );

      if (!facilitator) {
        return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
      }

      return NextResponse.json(
        { ...facilitator, _id: facilitator._id.toString() },
        { status: 200 }
      );
    }

    const facilitators = await db
      .collection('users')
      .find({ role: EDUCATION_FACILITATOR_ROLE })
      .project({ password: 0 })
      .toArray();

    return NextResponse.json(
      facilitators.map((f) => ({ ...f, _id: f._id.toString() })),
      { status: 200 }
    );
  } catch (error) {
    console.error("Education Facilitator GET error:", error);
    return NextResponse.json({ error: 'Failed to fetch facilitators' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageEducationFacilitators(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email and password are required' },
        { status: 400 }
      );
    }

    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password: hashed,
      role: EDUCATION_FACILITATOR_ROLE,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('users').insertOne(newUser);

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        email,
        role: EDUCATION_FACILITATOR_ROLE,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Education Facilitator POST error:", error);
    return NextResponse.json({ error: 'Failed to create facilitator' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageEducationFacilitators(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const { id, name, email, password } = await req.json();

    if (!id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: id and email are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid facilitator ID' }, { status: 400 });
    }

    const update: any = { name, email };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), role: EDUCATION_FACILITATOR_ROLE },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Facilitator updated' }, { status: 200 });
  } catch (error) {
    console.error("Education Facilitator PUT error:", error);
    return NextResponse.json({ error: 'Failed to update facilitator' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageEducationFacilitators(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing facilitator ID' }, { status: 400 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid facilitator ID' }, { status: 400 });
    }

    const result = await db.collection('users').deleteOne({
      _id: new ObjectId(id),
      role: EDUCATION_FACILITATOR_ROLE,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Facilitator deleted' }, { status: 200 });
  } catch (error) {
    console.error("Education Facilitator DELETE error:", error);
    return NextResponse.json({ error: 'Failed to delete facilitator' }, { status: 500 });
  }
}