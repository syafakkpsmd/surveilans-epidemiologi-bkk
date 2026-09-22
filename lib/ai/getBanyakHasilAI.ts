/**
 * lib/ai/getBanyakHasilAI.ts
 * -----------------------------------------------------------------
 * Ambil BANYAK hasil Analisis/Prediksi AI dalam SATU batch paralel,
 * dipanggil dari Server Component (page.tsx) bareng query data chart
 * yang sudah ada -- BUKAN dipanggil dari client/Box.
 *
 * PENTING -- HANYA IMPOR DARI SERVER COMPONENT:
 * File ini pakai createClient() dari lib/supabase/server.ts, yang di
 * dalamnya ada `import { cookies } from "next/headers"` -- API yang
 * cuma boleh dipakai di Server Component. JANGAN PERNAH impor file
 * ini dari file yang ada baris "use client" di paling atas (mis.
 * RatGuardClient.tsx) -- kalau butuh kunciAI()/tipe-tipe di client
 * component, impor dari lib/ai/hasilAiTypes.ts saja (file terpisah,
 * tanpa import server).
 *
 * CATATAN: query di bawah mengasumsikan kolom tabel
 * `riwayat_analisis_ai` = konteks, periode_key, tipe, wilayah_kerja,
 * metrik, ringkasan, anomali, rekomendasi, provider_dipakai,
 * dibuat_pada. Cek lagi nama kolom persisnya di Supabase Table
 * Editor -- kalau nama kolom provider/anomali beda, sesuaikan di
 * bagian `.select(...)` dan pemetaan di bawah.
 */

import { createClient } from '@/lib/supabase/server';
import type { PermintaanHasilAI, HasilAIStruktur } from './hasilAiTypes';
import { kunciAI as buatKunci } from './hasilAiTypes';

// Re-export tipe & kunciAI supaya Server Component yang sudah lanjur
// import dari file ini (page.tsx COP/PHQC/Rat Guard) tidak perlu ubah
// baris import-nya -- cukup file "use client" yang wajib pindah ke
// lib/ai/hasilAiTypes.ts.
export { kunciAI } from './hasilAiTypes';
export type { TipeHasilAI, PermintaanHasilAI, HasilAIStruktur } from './hasilAiTypes';

/**
 * Ambil banyak hasil AI sekaligus dalam SATU query batch (bukan N
 * query terpisah seperti sebelumnya) -- ambil semua baris yang
 * konteks & periode_key-nya relevan lewat .in(), lalu cocokkan
 * kombinasi persis (konteks+periode_key+tipe+wilayah_kerja+metrik)
 * di JS. Data sudah diurutkan terbaru dulu, jadi .find() otomatis
 * dapat baris TERBARU untuk tiap kombinasi (sama seperti
 * .order(...).limit(1) per query sebelumnya).
 *
 * Kalau daftar permintaan kosong, langsung balikin objek kosong
 * tanpa menyentuh Supabase sama sekali.
 */
export async function getBanyakHasilAI(
  permintaan: PermintaanHasilAI[]
): Promise<Record<string, HasilAIStruktur | null>> {
  if (permintaan.length === 0) return {};

  const supabase = await createClient();

  const daftarKonteks = Array.from(new Set(permintaan.map((p) => p.konteks)));
  const daftarPeriode = Array.from(new Set(permintaan.map((p) => p.periodeKey)));

  const { data, error } = await supabase
    .from('riwayat_analisis_ai')
    .select('konteks, periode_key, tipe, wilayah_kerja, metrik, ringkasan, anomali, rekomendasi, provider_dipakai, dibuat_pada')
    .in('konteks', daftarKonteks)
    .in('periode_key', daftarPeriode)
    .order('dibuat_pada', { ascending: false });

  if (error) {
    console.error('Gagal ambil hasil AI (batch):', error.message);
    return {};
  }

  const semua = data ?? [];
  const peta: Record<string, HasilAIStruktur | null> = {};

  permintaan.forEach((p) => {
    const cocok = semua.find(
      (r) =>
        r.konteks === p.konteks &&
        r.periode_key === p.periodeKey &&
        r.tipe === p.tipe &&
        (p.wilayahKerja ? r.wilayah_kerja === p.wilayahKerja : !r.wilayah_kerja) &&
        (p.metrik ? r.metrik === p.metrik : !r.metrik)
    );

    peta[buatKunci(p)] = cocok
      ? {
          ringkasan: cocok.ringkasan ?? '',
          anomali: cocok.anomali ?? '',
          rekomendasi: cocok.rekomendasi ?? '',
          providerDipakai: cocok.provider_dipakai ?? undefined,
          dibuatPada: cocok.dibuat_pada ?? undefined,
        }
      : null;
  });

  return peta;
}