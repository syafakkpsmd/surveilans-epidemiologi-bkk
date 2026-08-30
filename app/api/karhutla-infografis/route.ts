import { NextRequest, NextResponse } from 'next/server';
import { ambilRingkasanInfografisHarian } from '@/lib/supabase/queries-karhutla-server';
import { tanggalWitaHariIni } from '@/lib/karhutla/infografis-utils';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/karhutla-infografis?tanggal=YYYY-MM-DD
 *   -> ringkasan 1 hari (ISPA, kualitas udara, titik panas, SKDR mingguan,
 *      breakdown per wilker) untuk halaman /dashboard/karhutla/infografis.
 *   tanggal opsional, default hari ini (WITA).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggalParam = searchParams.get('tanggal');
    const tanggal = tanggalParam && POLA_TANGGAL.test(tanggalParam) ? tanggalParam : tanggalWitaHariIni();

    const ringkasan = await ambilRingkasanInfografisHarian(tanggal);
    return NextResponse.json(ringkasan);
  } catch (err) {
    console.error('[karhutla-infografis][GET]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil ringkasan info grafis.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
