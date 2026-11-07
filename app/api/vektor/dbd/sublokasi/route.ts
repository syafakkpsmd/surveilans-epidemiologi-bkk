// app/api/vektor/dbd/sublokasi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { daftarSubLokasi } from '@/lib/vektor/dbd/server';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

export const runtime = 'nodejs';

// /api/vektor/dbd/sublokasi?wilayah=WK01
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  const wilayah = req.nextUrl.searchParams.get('wilayah');
  const wk = await getKamusWilker();
  if (!wilayah || !wk.isKode(wilayah)) {
    return NextResponse.json({ error: 'Wilayah kerja wajib dipilih' }, { status: 400 });
  }
  return NextResponse.json({ data: await daftarSubLokasi(wilayah) });
}