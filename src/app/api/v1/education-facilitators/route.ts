// src/app/api/education-facilitators/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { requireAuth, sanitizeError } from '@/lib/apiAuth';
import { enforceRateLimit } from '@/lib/rateLimit';
import { logAudit } from '@/lib/auditLog';

const EDUCATION_FACILITATOR_ROLE = 'Education Facilitator';

async function getRequesterInfo(req: NextRequest): Promise<{ role: string; token: Record<string, unknown> } | NextResponse> {
  const { token, error } = await requireAuth(req);
  if (error) return error;
  return { role: String(token.role || ''), token };
}

function canManageEducationFacilitators(role: string): boolean {
  return role === 'Education Admin' || role === 'Super Admin';
}

export async function GET(req: NextRequest) {
  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
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
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rl = await enforceRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
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

    logAudit({
      action: 'create',
      collection: 'users',
      documentId: result.insertedId.toString(),
      userId: String(token.id || ''),
      userEmail: String(token.email || ''),
      userRole: requesterRole,
      summary: `Created Education Facilitator account for ${email}`,
    });

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        email,
        role: EDUCATION_FACILITATOR_ROLE,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
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

    logAudit({
      action: 'update',
      collection: 'users',
      documentId: id,
      userId: String(token.id || ''),
      userEmail: String(token.email || ''),
      userRole: requesterRole,
      summary: `Updated Education Facilitator ${id}`,
    });

    return NextResponse.json({ message: 'Facilitator updated' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
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

    logAudit({
      action: 'delete',
      collection: 'users',
      documentId: id,
      userId: String(token.id || ''),
      userEmail: String(token.email || ''),
      userRole: requesterRole,
      summary: `Deleted Education Facilitator ${id}`,
    });

    return NextResponse.json({ message: 'Facilitator deleted' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}