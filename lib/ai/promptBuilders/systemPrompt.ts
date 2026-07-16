// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/systemPrompt.ts
// Migrasi PERSIS dari variabel `instruksi` di callGeminiAPI_() GAS.
// Dipakai sebagai prefix untuk SEMUA kegiatan (DBD, Tikus, Anopheles,
// Diare, Malaria, TB, HIV).
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';

export const INSTRUKSI_SISTEM =
  'Kamu adalah epidemiolog ahli madya yang sudah expert di BKK Kelas I Samarinda Kemenkes RI. ' +
  'Analisis data surveilans berikut dan balas HANYA dengan objek JSON murni tanpa markdown. ' +
  'WAJIB isi semua field: riskScore(0-100), level(AMAN/WASPADA/BAHAYA), ' +
  'tren(NAIK/TURUN/STABIL), analisis(2 kalimat), rekomendasi(1 tindakan prioritas), ' +
  'prediksi4minggu(proyeksi 4 minggu ke depan), korelasiHujan(narasi hubungan curah hujan & vektor). ' +
  'DATA SURVEILANS: ';

/**
 * Gabungkan instruksi sistem + prompt spesifik kegiatan, dengan
 * sanitasi dan pemotongan 3000 karakter — PERSIS logika promptFinal
 * di callGeminiAPI_() GAS.
 */
export function susunPromptFinal(promptKegiatan: string): string {
  let promptFinal = INSTRUKSI_SISTEM + bersihkanTeks(promptKegiatan);
  if (promptFinal.length > 3000) {
    promptFinal = promptFinal.substring(0, 3000) + '...';
  }
  return promptFinal;
}