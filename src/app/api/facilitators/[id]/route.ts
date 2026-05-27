import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
        }

        const db = await getDb();
        const body = await req.json();

        // Only allow updating canAddStudent field
        if (!('canAddStudent' in body)) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const result = await db.collection('users').findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { canAddStudent: body.canAddStudent } },
            { returnDocument: 'after' }
        );

        if (!result) {
            return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
        }

        return NextResponse.json({ ...result, _id: result._id.toString() }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update facilitator: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
