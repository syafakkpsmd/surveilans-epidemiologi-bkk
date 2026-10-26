// lib/turso/hivKonstanta.ts
// Bagian MURNI (tanpa akses database) dari modul HIV. Aman diimpor komponen 'use client'.
// Jangan mengimpor lib/turso/hiv.ts dari komponen client: file itu memuat klien database
// (mysql2) yang tidak boleh ikut ke bundel browser.
export const KATEGORI_HASIL = ['Reaktif', 'Non Reaktif'] as const;
export const KATEGORI_HUBUNGAN_BERISIKO = ['Ya', 'Tidak'] as const;

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatPeriodeBulanan(periode: string): string {
  const [tahun, bulan] = periode.split('-');
  const idx = Number(bulan) - 1;
  return NAMA_BULAN[idx] ? `${NAMA_BULAN[idx]} ${tahun}` : periode;
}
