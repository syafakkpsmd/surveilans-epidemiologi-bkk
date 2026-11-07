// lib/klinik/ckg/config.ts
// Aman diimpor client maupun server component (tidak ada import server).
import type { Wilayah } from '@/lib/wilayah-kerja';

// Kolom `wilayah` di tabel menyimpan KODE baku wilayah kerja (mis. WK01), sesuai tabel wilker_ref.
export type OpsiWilayahCkg = { kode: string; nama: string };

/** Pilihan wilayah di form/filter CKG: semua wilayah kerja AKTIF (daftar dikelola di pengaturan wilayah kerja). */
export function opsiWilayahCkg(daftar: readonly Wilayah[]): OpsiWilayahCkg[] {
  return daftar.filter((w) => w.aktif).map((w) => ({ kode: w.kode, nama: w.nama }));
}

// Batas mengikuti register CKG: TD normal 120/80, gula darah diabet >= 200 mg/dL,
// lansia >= 60 tahun. Ubah di sini kalau definisinya berubah.
export const BATAS = { sistolik: 120, diastolik: 80, gulaDarah: 200, lansia: 60 };

export const KELOMPOK_UMUR = [
  { label: '<18', min: 0, max: 17 },
  { label: '18-39', min: 18, max: 39 },
  { label: '40-59', min: 40, max: 59 },
  { label: '60+ (lansia)', min: 60, max: 150 },
];

export function hitungIMT(bb: number, tb: number): number | null {
  if (!bb || !tb) return null;
  const m = tb / 100;
  return Math.round((bb / (m * m)) * 10) / 10;
}

// Kategori Asia-Pasifik; cocok dengan kolom "Kategori IMT" di register
// (23,4 = Overweight, 25,1 = Obesitas).
export function kategoriIMT(imt: number | null): string | null {
  if (imt == null) return null;
  if (imt < 18.5) return 'Kurus';
  if (imt < 23) return 'Normal';
  if (imt < 25) return 'Overweight';
  return 'Obesitas';
}