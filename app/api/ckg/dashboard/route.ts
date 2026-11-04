// app/api/ckg/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCkg } from '@/lib/klinik/ckg/auth';
import { ambilDashboard, filterDariQuery } from '@/lib/klinik/ckg/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireCkg();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const data = await ambilDashboard(filterDariQuery(req.nextUrl.searchParams));
  return NextResponse.json(data);
}