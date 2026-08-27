import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ambilHotspotKaltim } from '@/lib/nasa-firms/fetchHotspot';

/**
 * GET /api/hotspot-karhutla
 *   -> baca hotspot dari cache Supabase (dipakai halaman/peta).
 *      Query param opsional: ?hari=3 (default 3 hari terakhir)
 *
 * POST /api/hotspot-karhutla
 *   -> trigger fetch baru dari NASA FIRMS + upsert ke cache.
 *      Panggil ini via cron job (mis. Vercel Cron tiap 3 jam),
 *      BUKAN dari client langsung, supaya kuota FIRMS API tidak jebol.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hari = Number(searchParams.get('hari') ?? '3');

    const supabase = await createClient();
    const sejakTanggal = new Date();
    sejakTanggal.setDate(sejakTanggal.getDate() - hari);

    const { data, error } = await supabase
      .from('hotspot_nasa_kaltim')
      .select('*')
      .gte('tanggal_deteksi', sejakTanggal.toISOString().slice(0, 10))
      .order('tanggal_deteksi', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data, jumlah: data?.length ?? 0 });
  } catch (err) {
    console.error('[hotspot-karhutla][GET]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data hotspot dari cache.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Proteksi sederhana: cron secret, supaya endpoint sync tidak bisa
    // dipicu sembarangan orang (Vercel Cron mengirim header ini otomatis
    // kalau CRON_SECRET di-set di project settings).
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hotspots = await ambilHotspotKaltim({
      source: 'MODIS_NRT',
      dayRange: 1,
      confidenceMin: 80,
    });

    if (hotspots.length === 0) {
      return NextResponse.json({ pesan: 'Tidak ada hotspot confidence >80% di Kaltim saat ini.', jumlah: 0 });
    }

    const supabase = createAdminClient(); // service role - bypass RLS, khusus operasi sistem/cron

    const baris = hotspots.map((h) => ({
      latitude: h.latitude,
      longitude: h.longitude,
      tanggal_deteksi: h.tanggalDeteksi,
      jam_deteksi: h.jamDeteksi,
      confidence: h.confidence,
      confidence_asli: h.confidenceAsli,
      satelit: h.satelit,
      frp: h.frp,
      sumber_source: h.sumberSource,
    }));

    // upsert berdasarkan unique constraint (lat, lon, tanggal, jam, source)
    // supaya sync berulang tidak menghasilkan duplikat
    const { error } = await supabase
      .from('hotspot_nasa_kaltim')
      .upsert(baris, {
        onConflict: 'latitude,longitude,tanggal_deteksi,jam_deteksi,sumber_source',
        ignoreDuplicates: true,
      });

    if (error) throw error;

    return NextResponse.json({ pesan: 'Sync hotspot berhasil.', jumlah: baris.length });
  } catch (err) {
    console.error('[hotspot-karhutla][POST]', err);
    return NextResponse.json(
      { error: 'Gagal sync data hotspot dari NASA FIRMS.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}