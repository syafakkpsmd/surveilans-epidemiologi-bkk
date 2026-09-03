import { NextResponse } from 'next/server';
import { listFilesInFolder } from '@/lib/klinik/sheets';

export async function GET() {
  try {
    return NextResponse.json({ success: true, files: await listFilesInFolder() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}