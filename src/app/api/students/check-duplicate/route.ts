// src/app/api/students/check-duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Student } from '@/lib/models';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = body as any;
    const firstName = (body.First_Name || '').trim();
    const fatherName = (body.Father_Name || raw.Last_Name || '').trim();
    const grandfatherName = (body.Grandfather_Name || '').trim();
    const motherName = (body.Mothers_Name || raw.Mother_Name || '').trim();
    const sex = (body.Sex || '').trim();

    if (!firstName || !fatherName || !grandfatherName || !motherName || !sex) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const escapedFirstName = escapeRegex(firstName);
    const escapedFatherName = escapeRegex(fatherName);
    const escapedGrandfatherName = escapeRegex(grandfatherName);
    const escapedMotherName = escapeRegex(motherName);
    const escapedSex = escapeRegex(sex);

    const duplicateQuery: any = {
      First_Name: { $regex: new RegExp(`^${escapedFirstName}$`, "i") },
      Grandfather_Name: { $regex: new RegExp(`^${escapedGrandfatherName}$`, "i") },
      Sex: { $regex: new RegExp(`^${escapedSex}$`, "i") },
      $and: [
        {
          $or: [
            { Father_Name: { $regex: new RegExp(`^${escapedFatherName}$`, "i") } },
            { Last_Name: { $regex: new RegExp(`^${escapedFatherName}$`, "i") } },
          ],
        },
        {
          $or: [
            { Mothers_Name: { $regex: new RegExp(`^${escapedMotherName}$`, "i") } },
            { Mother_Name: { $regex: new RegExp(`^${escapedMotherName}$`, "i") } },
          ],
        },
      ],
    };

    const existingStudent = await db.collection<Student>('students').findOne(duplicateQuery);
    return NextResponse.json({ exists: !!existingStudent }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to check duplicate' }, { status: 500 });
  }
}