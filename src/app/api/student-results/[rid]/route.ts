import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { Subject } from '@/lib/models';

// Fetch a subject by ID
async function fetchSubject(id: string): Promise<Subject | null> {
  try {
    const db = await getDb();
    const subjectCollection = db.collection<Subject>('subjects');

    if (!ObjectId.isValid(id)) {
      return null;
    }

    const subject = await subjectCollection.findOne({ _id: new ObjectId(id) });
    return subject;
  } catch (error) {
    console.error('Error fetching subject:', error);
    return null;
  }
}

// Delete a subject by ID
async function deleteSubject(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    const subjectCollection = db.collection<Subject>('subjects');

    if (!ObjectId.isValid(id)) {
      return false;
    }

    const result = await subjectCollection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting subject:', error);
    return false;
  }
}

// GET handler: Fetch a subject by ID
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const subject = await fetchSubject(id);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: subject._id ? subject._id.toString() : '',
      name: subject.name,
      grade: subject.grade,
      academicYear: subject.academicYear,
      description: subject.description,
      teacherId: subject.teacherId,
      students: subject.students,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
  }
}

// DELETE handler: Delete a subject by ID
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const success = await deleteSubject(id);
    if (!success) {
      return NextResponse.json({ error: 'Subject not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}

// Generate static parameters for all subject IDs
export async function generateStaticParams() {
  try {
    const db = await getDb();
    const subjectCollection = db.collection<Subject>('subjects');
    const subjects = await subjectCollection
      .find({}, { projection: { _id: 1 } })
      .toArray();
    return subjects.map((subject) => ({ id: subject._id.toString() }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}