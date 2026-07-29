/**
 * lib/ai/hasilAiTypes.ts
 * -----------------------------------------------------------------
 * Tipe-tipe dan helper MURNI (tidak menyentuh Supabase/cookies sama
 * sekali) yang berkaitan dengan hasil batch-fetch Analisis/Prediksi
 * AI. Sengaja dipisah dari getBanyakHasilAI.ts supaya file ini AMAN
 * diimpor dari client component ("use client", mis. RatGuardClient.tsx,
 * TtuClient.tsx, dst).
 *
 * ATURAN PENTING:
 * - File ini TIDAK BOLEH mengimpor apa pun dari lib/supabase/server.ts
 *   (atau apa pun yang akhirnya mengimpor next/headers) -- kalau
 *   ditambahkan, error "next/headers only available in Server
 *   Components" akan muncul lagi di semua client component yang
 *   mengimpor kunciAI()/tipe dari sini.
 * - Fungsi yang BENAR-BENAR fetch ke Supabase (getBanyakHasilAI) ada
 *   di lib/ai/getBanyakHasilAI.ts, HANYA boleh diimpor dari
 *   Server Component (page.tsx), TIDAK PERNAH dari file "use client".
 */

export type TipeHasilAI = 'analisis' | 'prediksi';

export interface PermintaanHasilAI {
  konteks: string;
  periodeKey: string;
  tipe: TipeHasilAI;
  wilayahKerja?: string;
  metrik?: string;
}

export interface HasilAIStruktur {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
  providerDipakai?: string;
  dibuatPada?: string;
}

/**
 * Kunci unik untuk 1 kombinasi permintaan -- dipakai sebagai key di
 * Map hasil (lib/ai/getBanyakHasilAI.ts di server), dan dipakai lagi
 * di client component untuk mencari kembali hasilnya sesuai
 * granularitas/rentang/wilayah yang sedang aktif.
 */
export function kunciAI(p: {
  konteks: string;
  periodeKey: string;
  tipe: TipeHasilAI;
  wilayahKerja?: string;
  metrik?: string;
}): string {
  return [p.konteks, p.periodeKey, p.tipe, p.wilayahKerja ?? '', p.metrik ?? ''].join('|');
}