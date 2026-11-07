// lib/vektor/diare/config.ts
// Aman diimpor client maupun server (tanpa import server).
//
// Daftar wilayah kerja TIDAK ditulis di sini: sumbernya tabel `wilker_ref` di database.
//   * Server : const wk = await getKamusWilker();            // '@/lib/wilayah-kerja/server'
//   * Client : const wk = useMemo(() => buatKamus(wilayah), [wilayah]);  // `wilayah` dari props server
// lalu teruskan `wk` ke fungsi bantu di bawah.
import type { KamusWilker } from '@/lib/wilayah-kerja';

export const JENIS = ['lalat', 'kecoa'] as const;
export type Jenis = (typeof JENIS)[number];
export const LABEL_JENIS: Record<Jenis, string> = { lalat: 'Lalat', kecoa: 'Kecoa' };

// Lalat dan kecoa: nilai <= 2 memenuhi syarat, > 2 tidak memenuhi syarat.
export const AMBANG_MS = 2;
export const STATUS_MS = 'Memenuhi Syarat';
export const STATUS_TMS = 'Tidak Memenuhi Syarat';

export function hitungStatus(nilai: number): string {
  return nilai <= AMBANG_MS ? STATUS_MS : STATUS_TMS;
}

/** Opsi dropdown wilayah untuk input baru (hanya wilayah yang aktif). */
export function opsiWilayah(wk: KamusWilker): { kode: string; nama: string }[] {
  return wk.aktif.map((w) => ({ kode: w.kode, nama: w.nama }));
}

/** Kode wilayah yang sah untuk input baru (aktif saja). Dipakai validasi unggahan/form. */
export function kodeWilayahAktif(wk: KamusWilker): string[] {
  return wk.daftarKodeAktif;
}

/** Kode -> nama panjang, termasuk wilayah nonaktif (supaya data historis tetap terbaca). */
export function namaWilayah(wk: KamusWilker): Record<string, string> {
  return wk.namaPanjangByKode;
}

/**
 * "Samarinda", "APT Pranoto", "Tanjung Santan", "Pelabuhan Laut Sangatta" atau "WK02" -> kode baku;
 * null bila tidak dikenali (pemanggil wajib menolak/melaporkan, jangan menebak).
 * Pencocokan memakai kamus wilker: kode, nama panjang/pendek, nama peta, dan alias yang terdaftar admin.
 */
export function petakanWilayah(wk: KamusWilker, teks: string): string | null {
  return wk.kodeDariTeks(teks);
}

/** Angka dari sel Excel/form: terima 2,2 (koma Indonesia), 2.2, 1.234,5 dan 1,234.5. */
export function parseAngka(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}