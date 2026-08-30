// lib/nasa-firms/syncHotspot.ts
import { createAdminClient } from '@/lib/supabase/admin';
import { ambilHotspotKaltim } from './fetchHotspot';

export interface HasilBackfillHotspot {
  pesan: string;
  totalTitik: number;
  totalHari: number;
  chunkGagal: { dari: string; sampai: string; pesanError: string }[];
}

/**
 * Tarik histori hotspot NASA FIRMS untuk rentang tanggal tertentu di masa
 * lalu (mis. "dari awal Agustus") dan upsert ke cache Supabase.
 *
 * FIRMS Area API membatasi DAY_RANGE maksimal 10 hari per request, jadi
 * rentang yang lebih panjang dipecah jadi beberapa chunk 10-harian berurutan.
 * Tiap chunk di-upsert langsung (bukan dikumpulkan dulu di memori) supaya
 * kalau salah satu chunk gagal (mis. rate limit FIRMS), chunk lain yang
 * sudah berhasil tidak ikut hilang -- fungsi tetap lanjut ke chunk berikut
 * dan melaporkan chunk mana saja yang gagal di akhir.
 *
 * Catatan retensi: FIRMS *_NRT (near real-time) biasanya hanya menyimpan
 * data ~2 bulan ke belakang. Untuk histori lebih lama dari itu, perlu
 * source *_SP (Standard Processing/arsip) yang publikasinya lebih lambat
 * tapi datanya sudah final -- fungsi ini masih pakai MODIS_NRT (source yang
 * sama seperti sync harian) supaya konsisten; kalau suatu saat perlu histori
 * lebih dari ~2 bulan, source-nya perlu diganti ke 'MODIS_SP'.
 */
export async function backfillHotspotKaltim(
  dariTanggal: string,
  sampaiTanggal: string
): Promise<HasilBackfillHotspot> {
  const mulai = new Date(`${dariTanggal}T00:00:00Z`);
  const akhir = new Date(`${sampaiTanggal}T00:00:00Z`);

  if (Number.isNaN(mulai.getTime()) || Number.isNaN(akhir.getTime())) {
    throw new Error('Format tanggal tidak valid, gunakan YYYY-MM-DD.');
  }
  if (mulai > akhir) {
    throw new Error('Tanggal awal harus sebelum atau sama dengan tanggal akhir.');
  }

  const supabase = createAdminClient();
  const MAKS_HARI_PER_CHUNK = 10; // batas resmi FIRMS Area API

  let totalTitik = 0;
  let totalHari = 0;
  const chunkGagal: HasilBackfillHotspot['chunkGagal'] = [];

  let kursor = new Date(mulai);
  while (kursor <= akhir) {
    const sisaHari = Math.floor((akhir.getTime() - kursor.getTime()) / 86_400_000) + 1;
    const panjangChunk = Math.min(MAKS_HARI_PER_CHUNK, sisaHari);
    const chunkDari = kursor.toISOString().slice(0, 10);
    const chunkSampaiDate = new Date(kursor);
    chunkSampaiDate.setUTCDate(chunkSampaiDate.getUTCDate() + panjangChunk - 1);
    const chunkSampai = chunkSampaiDate.toISOString().slice(0, 10);

    try {
      const hotspots = await ambilHotspotKaltim({
        source: 'MODIS_NRT',
        dayRange: panjangChunk,
        date: chunkDari,
        confidenceMin: 80,
      });

      if (hotspots.length > 0) {
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

        const { error } = await supabase
          .from('hotspot_nasa_kaltim')
          .upsert(baris, {
            onConflict: 'latitude,longitude,tanggal_deteksi,jam_deteksi,sumber_source',
            ignoreDuplicates: true,
          });

        if (error) throw error;
        totalTitik += baris.length;
      }

      totalHari += panjangChunk;
    } catch (err) {
      chunkGagal.push({ dari: chunkDari, sampai: chunkSampai, pesanError: (err as Error).message });
    }

    kursor.setUTCDate(kursor.getUTCDate() + panjangChunk);
  }

  const pesan =
    chunkGagal.length === 0
      ? `Backfill selesai: ${totalTitik} titik dari ${totalHari} hari (${dariTanggal} s/d ${sampaiTanggal}).`
      : `Backfill selesai sebagian: ${totalTitik} titik berhasil, tapi ${chunkGagal.length} rentang gagal ditarik (lihat detail).`;

  return { pesan, totalTitik, totalHari, chunkGagal };
}

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