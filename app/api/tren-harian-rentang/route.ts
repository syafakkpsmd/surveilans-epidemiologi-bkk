import { NextRequest, NextResponse } from 'next/server';
import { ambilTrenHarianRentang } from '@/lib/supabase/queries-karhutla-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tanggalAwal = searchParams.get('awal');
  const tanggalAkhir = searchParams.get('akhir');
  const wilayah = searchParams.get('wilayah') ?? 'Semua';

  if (!tanggalAwal || !tanggalAkhir) {
    return NextResponse.json({ error: 'Parameter awal & akhir wajib diisi' }, { status: 400 });
  }
  try {
    const data = await ambilTrenHarianRentang({ tanggalAwal, tanggalAkhir, wilayahKey: wilayah });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}