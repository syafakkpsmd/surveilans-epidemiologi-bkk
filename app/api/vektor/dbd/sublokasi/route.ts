// app/api/vektor/dbd/sublokasi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { KODE_WILAYAH } from '@/lib/vektor/umum';
import { daftarSubLokasi } from '@/lib/vektor/dbd/server';

export const runtime = 'nodejs';

// /api/vektor/dbd/sublokasi?wilayah=WK01
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  const wilayah = req.nextUrl.searchParams.get('wilayah');
  if (!wilayah || !KODE_WILAYAH.includes(wilayah)) {
    return NextResponse.json({ error: 'Wilayah kerja wajib dipilih' }, { status: 400 });
  }
  return NextResponse.json({ data: await daftarSubLokasi(wilayah) });
}