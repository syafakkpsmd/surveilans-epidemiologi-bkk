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
 * Ambil banyak hasil AI sekaligus. Query tetap N panggilan ke
 * Supabase (satu per kombinasi konteks+periode+tipe+wilayah+metrik),
 * TAPI dijalankan paralel via Promise.all dalam SATU siklus render
 * server -- bukan N round-trip terpisah dari browser client. Ini
 * yang menghilangkan waterfall request di Network tab.
 *
 * Kalau daftar permintaan kosong, langsung balikin objek kosong
 * tanpa menyentuh Supabase sama sekali.
 */
export async function getBanyakHasilAI(
  permintaan: PermintaanHasilAI[]
): Promise<Record<string, HasilAIStruktur | null>> {
  if (permintaan.length === 0) return {};

  const supabase = await createClient();

  const hasilArray = await Promise.all(
    permintaan.map(async (p) => {
      let query = supabase
        .from('riwayat_analisis_ai')
        .select('ringkasan, anomali, rekomendasi, provider_dipakai, dibuat_pada')
        .eq('konteks', p.konteks)
        .eq('periode_key', p.periodeKey)
        .eq('tipe', p.tipe)
        .order('dibuat_pada', { ascending: false })
        .limit(1);

      if (p.wilayahKerja) query = query.eq('wilayah_kerja', p.wilayahKerja);
      if (p.metrik) query = query.eq('metrik', p.metrik);

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error(`Gagal ambil hasil AI (${p.konteks}/${p.tipe}/${p.periodeKey}):`, error.message);
        return null;
      }
      if (!data) return null;

      return {
        ringkasan: data.ringkasan ?? '',
        anomali: data.anomali ?? '',
        rekomendasi: data.rekomendasi ?? '',
        providerDipakai: data.provider_dipakai ?? undefined,
        dibuatPada: data.dibuat_pada ?? undefined,
      } satisfies HasilAIStruktur;
    })
  );

  const peta: Record<string, HasilAIStruktur | null> = {};
  permintaan.forEach((p, i) => {
    peta[buatKunci(p)] = hasilArray[i];
  });
  return peta;
}