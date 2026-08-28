import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ambilHotspotKaltim } from '@/lib/nasa-firms/fetchHotspot';
import { getUserRole } from '@/lib/auth/get-user-role';

/**
 * GET /api/hotspot-karhutla
 *   -> baca hotspot dari cache Supabase (dipakai halaman/peta).
 *      Query param opsional: ?hari=3 (default 3 hari terakhir)
 *
 * POST /api/hotspot-karhutla
 *   -> trigger fetch baru dari NASA FIRMS + upsert ke cache.
 *      Dipicu oleh 2 sumber:
 *      1) Cron (Vercel Cron / cron eksternal) — kirim header
 *         Authorization: Bearer <CRON_SECRET>
 *      2) Tombol "Sinkronisasi Sekarang" di dashboard admin —
 *         cukup butuh sesi login dengan role 'admin' (lihat getUserRole()).
 *      Selain 2 sumber itu, request ditolak (401/403) supaya kuota
 *      NASA FIRMS API tidak jebol dipanggil sembarang orang.
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
    // Proteksi endpoint sync: boleh dipicu oleh 2 pihak —
    // 1) Vercel Cron / cron eksternal, yang mengirim header CRON_SECRET
    // 2) Admin yang sedang login di dashboard, lewat tombol "Sinkronisasi Sekarang"
    // Client BUKAN admin tidak boleh memicu endpoint ini supaya kuota FIRMS API tidak jebol.
    const authHeader = request.headers.get('authorization');
    const punyaCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!punyaCronSecret) {
      const role = await getUserRole();
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Hanya admin yang boleh memicu sinkronisasi manual.' }, { status: 403 });
      }
    }

    const hotspots = await ambilHotspotKaltim({
      source: 'MODIS_NRT',
      dayRange: 3, // tarik mundur 3 hari terakhir tiap sync — aman krn upsert, menutup celah keterlambatan rilis data NASA
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