// lib/nasa-firms/syncHotspot.ts
import { createAdminClient } from '@/lib/supabase/admin';
import { ambilHotspotKaltim } from './fetchHotspot';

export interface HasilSyncHotspot {
  pesan: string;
  jumlah: number;
}

/**
 * Tarik hotspot terbaru dari NASA FIRMS + upsert ke cache Supabase.
 * Dipakai bersama oleh:
 * - app/api/cron/hotspot-karhutla/route.ts  (dipicu Vercel Cron / cron eksternal)
 * - app/api/hotspot-karhutla/route.ts (POST) (dipicu tombol "Sinkronisasi Sekarang" admin)
 * Supaya logika sync tidak duplikat di 2 tempat.
 */
export async function sinkronisasiHotspotKaltim(): Promise<HasilSyncHotspot> {
  const hotspots = await ambilHotspotKaltim({
    source: 'MODIS_NRT',
    dayRange: 3, // tarik mundur 3 hari terakhir tiap sync -- aman krn upsert, menutup celah keterlambatan rilis data NASA
    confidenceMin: 80,
  });

  if (hotspots.length === 0) {
    return { pesan: 'Tidak ada hotspot confidence >80% di Kaltim saat ini.', jumlah: 0 };
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

  return { pesan: 'Sync hotspot berhasil.', jumlah: baris.length };
}