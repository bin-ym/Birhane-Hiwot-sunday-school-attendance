// src/app/api/sheet/health/route.ts
import { NextResponse } from 'next/server';
import { createAuth } from '../route';
import { google } from 'googleapis';

export async function GET() {
  try {
    if (!process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { 
          status: 'unhealthy',
          error: 'GOOGLE_SHEET_ID not configured',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    const auth = await createAuth();
    const sheetsApi = google.sheets({ version: "v4", auth });

    // Test basic access
    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID
    });

    return NextResponse.json({
      status: 'healthy',
      message: 'Google Sheets connection successful',
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      sheetCount: meta.data.sheets?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Google Sheets health check failed:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}