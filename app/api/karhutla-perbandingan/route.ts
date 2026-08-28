import { NextRequest, NextResponse } from 'next/server';
import { ambilPerbandinganIspaHotspot } from '@/lib/supabase/queries-karhutla-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const granularitas = (searchParams.get('granularitas') ?? 'mingguan') as 'mingguan' | 'bulanan';
    const tahun = Number(searchParams.get('tahun') ?? new Date().getFullYear());
    const periodeAwal = Number(searchParams.get('awal') ?? 1);
    const periodeAkhir = Number(searchParams.get('akhir') ?? (granularitas === 'mingguan' ? 53 : 12));
    const wilayahKeys = searchParams.getAll('wilayah').filter((v) => v && v !== 'Semua');

    if (periodeAwal > periodeAkhir) {
      return NextResponse.json(
        { error: 'Periode awal tidak boleh lebih besar dari periode akhir.' },
        { status: 400 }
      );
    }
    const data = await ambilPerbandinganIspaHotspot({
      granularitas, tahun, periodeAwal, periodeAkhir, wilayahKeys,
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[karhutla-perbandingan][GET]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data perbandingan ISPA-hotspot.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}