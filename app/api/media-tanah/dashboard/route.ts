// app/api/media-tanah/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireStaf } from '@/lib/media-tanah/auth';
import { ambilDashboard, filterDariQuery } from '@/lib/media-tanah/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireStaf();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const data = await ambilDashboard(filterDariQuery(req.nextUrl.searchParams));
  return NextResponse.json(data);
}