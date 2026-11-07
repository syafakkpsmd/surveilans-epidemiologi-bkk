// lib/vektor/dbd/config.ts
// Aman diimpor client maupun server.

export const ZONA = ['Buffer', 'Perimeter'] as const;
export type Zona = (typeof ZONA)[number];

export function bacaZona(v: unknown): Zona | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (s.startsWith('buffer')) return 'Buffer';
  if (s.startsWith('perimeter')) return 'Perimeter';
  return null;
}

export const TINDAKAN_YA = 'Ya';
export const TINDAKAN_TIDAK = 'Tidak';

/** Target nasional ABJ >= 95%. Hanya untuk penanda di tampilan, bukan untuk validasi. */
export const AMBANG_ABJ = 95;

const bulat2 = (n: number) => Math.round(n * 100) / 100;

export interface Indeks { abj: number; hi: number; ci: number; bi: number }

/** `rumah` harus >= 1. Semua indeks dalam persen, dua desimal. */
export function hitungIndeks(
  rumah: number, rumahPositif: number, container: number, containerPositif: number
): Indeks {
  return {
    abj: bulat2((100 * (rumah - rumahPositif)) / rumah),
    hi: bulat2((100 * rumahPositif) / rumah),
    ci: container > 0 ? bulat2((100 * containerPositif) / container) : 0,
    bi: bulat2((100 * containerPositif) / rumah),
  };
}

/**
 * Form dan sheet memakai liter untuk insektisida fogging. Isi 1 bila angka lama di kolom
 * jml_insektisida_fogging_ml tersimpan dalam liter, 1000 bila tersimpan dalam ml.
 * CEK dengan query satuan di bagian akhir sebelum form dipakai.
 */
export const LITER_KE_DB = 1;