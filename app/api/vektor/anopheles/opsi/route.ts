// app/api/vektor/anopheles/opsi/route.ts
import { NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { ambilOpsi } from '@/lib/vektor/anopheles/server';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await requireVektor())) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  return NextResponse.json(await ambilOpsi());
}