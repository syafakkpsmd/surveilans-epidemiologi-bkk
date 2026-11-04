import { NextResponse } from 'next/server';
import { getDataEmerging, getDaftarPenyakit } from '@/lib/db/modul/nasionalEmerging';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tahun = Number(searchParams.get('tahun'));
  const penyakit = searchParams.get('penyakit') ?? undefined;
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2100) {
    return NextResponse.json({ error: 'Tahun tidak valid.' }, { status: 400 });
  }
  if (penyakit && !(await getDaftarPenyakit()).includes(penyakit)) {
    return NextResponse.json({ error: 'Penyakit tidak valid.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await getDataEmerging(tahun, penyakit));
  } catch (e: any) {
    console.error('[api nasional-emerging]', e?.message);
    return NextResponse.json({ error: 'Gagal memuat data.' }, { status: 500 });
  }
}