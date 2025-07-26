// src/app/api/payment/route.ts

import { getDb } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const db = await getDb();
  const url = new URL(req.url);
  const year = url.searchParams.get('year');
  const studentId = 'default'; // Later: make this dynamic

  if (!year) {
    return new Response(JSON.stringify({ message: 'Year is required' }), { status: 400 });
  }

  const collection = db.collection('payment_status');
  const record = await collection.findOne({ academicYear: year, studentId });

  return new Response(JSON.stringify(record?.data || {}), { status: 200 });
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();
  const { year, data } = body;
  const studentId = 'default'; // Later: make this dynamic

  if (!year || typeof data !== 'object') {
    return new Response(JSON.stringify({ message: 'Invalid request' }), { status: 400 });
  }

  const collection = db.collection('payment_status');

  await collection.updateOne(
    { academicYear: year, studentId },
    { $set: { data } },
    { upsert: true }
  );

  return new Response(JSON.stringify({ message: 'Saved successfully' }), { status: 200 });
}
