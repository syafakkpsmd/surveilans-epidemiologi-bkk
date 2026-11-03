import { NextRequest, NextResponse } from 'next/server';
import { sinkronisasiHotspotKaltim } from '@/lib/nasa-firms/syncHotspot';

/**
 * GET /api/cron/hotspot-karhutla
 *
 * Route KHUSUS untuk dipanggil oleh scheduler (Vercel Cron lewat vercel.json,
 * atau cron eksternal seperti cron-job.org/GitHub Actions).
 *
 * PENTING: Vercel Cron SELALU memanggil path yang terdaftar di vercel.json
 * dengan HTTP GET -- tidak pernah POST. Endpoint sync sebelumnya
 * (/api/hotspot-karhutla, method POST) tidak pernah benar-benar dipicu oleh
 * cron karena mismatch method ini; hanya tombol manual admin yang jalan
 * (tombol itu memang fetch dengan method POST secara eksplisit dari browser).
 *
 * Proteksi: wajib header Authorization: Bearer <CRON_SECRET>. Vercel mengirim
 * header ini otomatis untuk setiap invocation cron, asal env var CRON_SECRET
 * sudah di-set di Project Settings -> Environment Variables.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secretCocok = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!secretCocok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const hasil = await sinkronisasiHotspotKaltim();
    return NextResponse.json(hasil);
  } catch (err) {
    console.error('[cron/hotspot-karhutla][GET]', err);
    return NextResponse.json(
      { error: 'Gagal sync data hotspot dari NASA FIRMS.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}