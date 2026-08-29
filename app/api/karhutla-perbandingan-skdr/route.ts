import { NextRequest, NextResponse } from 'next/server';
import { ambilPerbandinganSkdrHotspot } from '@/lib/supabase/queries-karhutla-server';

/**
 * GET /api/karhutla-perbandingan-skdr
 * Varian /api/karhutla-perbandingan khusus sumber data SKDR (jenis
 * penyakit ISPA-AA, id 24) -- dipakai tombol "SKDR" di grafik
 * Analisis Kasus ISPA vs Titik Panas. Selalu mingguan (skdr_mingguan
 * memang per-minggu), wilayah cuma 1 nilai (taksonomi wilayah_kerja
 * SKDR beda dari kode_wilker/zona punya modul karhutla).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = Number(searchParams.get('tahun') ?? new Date().getFullYear());
    const periodeAwal = Number(searchParams.get('awal') ?? 1);
    const periodeAkhir = Number(searchParams.get('akhir') ?? 53);
    const wilayahKerja = searchParams.get('wilayah') || undefined;

    if (periodeAwal > periodeAkhir) {
      return NextResponse.json(
        { error: 'Periode awal tidak boleh lebih besar dari periode akhir.' },
        { status: 400 }
      );
    }

    const data = await ambilPerbandinganSkdrHotspot({ tahun, periodeAwal, periodeAkhir, wilayahKerja });
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[karhutla-perbandingan-skdr][GET]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data perbandingan ISPA (SKDR)-hotspot.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}