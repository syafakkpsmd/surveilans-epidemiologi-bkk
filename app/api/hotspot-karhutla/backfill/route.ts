import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth/get-user-role';
import { backfillHotspotKaltim } from '@/lib/nasa-firms/syncHotspot';

/**
 * POST /api/hotspot-karhutla/backfill
 *   -> tarik histori hotspot NASA FIRMS untuk rentang tanggal masa lalu
 *      (mis. "dari 1 Agustus sampai hari ini") + upsert ke cache Supabase.
 *      Body JSON: { dariTanggal: 'YYYY-MM-DD', sampaiTanggal: 'YYYY-MM-DD' }
 *      Admin-only -- endpoint ini bisa memicu banyak request ke FIRMS API
 *      sekaligus (1 request per 10 hari), jadi lebih ketat daripada sync
 *      biasa (yang cuma tarik 3 hari terakhir).
 */
export async function POST(request: NextRequest) {
  try {
    const role = await getUserRole();
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang boleh menjalankan backfill histori hotspot.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dariTanggal = typeof body.dariTanggal === 'string' ? body.dariTanggal : null;
    const sampaiTanggal = typeof body.sampaiTanggal === 'string' ? body.sampaiTanggal : null;

    if (!dariTanggal || !sampaiTanggal) {
      return NextResponse.json({ error: 'dariTanggal dan sampaiTanggal wajib diisi (format YYYY-MM-DD).' }, { status: 400 });
    }

    const hasil = await backfillHotspotKaltim(dariTanggal, sampaiTanggal);
    return NextResponse.json(hasil);
  } catch (err) {
    console.error('[hotspot-karhutla/backfill][POST]', err);
    return NextResponse.json(
      { error: 'Gagal menjalankan backfill histori hotspot.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
