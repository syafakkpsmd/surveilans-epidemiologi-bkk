// lib/vektor/tikus/config.ts
// Aman diimpor client maupun server.

export const AREA_SURVEI = 'Perimeter';
export const JENIS_TRAP = 'Perangkap Hidup';

export const SPESIES = [
  { kode: 'RT', nama: 'Rattus tanezumi (RT)' },
  { kode: 'RN', nama: 'Rattus norvegicus (RN)' },
  { kode: 'MM', nama: 'Mus musculus (MM)' },
  { kode: 'Lainnya', nama: 'Lainnya' },
] as const;
export type KodeSpesies = (typeof SPESIES)[number]['kode'];

export const PEMERIKSAAN = [
  { kunci: 'leptospira', label: 'Leptospira', kolom: 'hasil_leptospira' },
  { kunci: 'pes', label: 'Pes', kolom: 'hasil_pes' },
  { kunci: 'hantavirus', label: 'Hantavirus', kolom: 'hasil_hantavirus' },
] as const;

export type HasilLab = 'Positif' | 'Negatif';

/** Success trap (%) = tertangkap / dipasang x 100, dua desimal. */
export function hitungTsi(tertangkap: number, dipasang: number): number {
  return Math.round((tertangkap / dipasang) * 10000) / 100;
}

/** Indeks pinjal = jumlah pinjal / tikus tertangkap; null bila tidak ada tikus tertangkap. */
export function hitungIndexPinjal(pinjal: number, tertangkap: number): number | null {
  return tertangkap > 0 ? Math.round((pinjal / tertangkap) * 100) / 100 : null;
}

export function bacaSpesies(v: unknown): KodeSpesies | null {
  const s = String(v ?? '').trim().toLowerCase().replace(/[().]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/\b(rt|tanezumi)\b/.test(s)) return 'RT';
  if (/\b(rn|norvegicus)\b/.test(s)) return 'RN';
  if (/\b(mm|musculus)\b/.test(s)) return 'MM';
  if (/\b(lainnya|lain|other|others)\b/.test(s)) return 'Lainnya';
  return null;
}

/** Kosong atau "-" = tidak diperiksa (nilai null). */
export function bacaHasilLab(v: unknown): { ok: true; nilai: HasilLab | null } | { ok: false } {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s || s === '-' || s === 'belum' || s === 'tidak diperiksa') return { ok: true, nilai: null };
  if (/^(neg|negatif|negative|non[\s-]?reaktif|tidak reaktif)$/.test(s)) return { ok: true, nilai: 'Negatif' };
  if (/^(pos|positif|positive|reaktif|\+)$/.test(s)) return { ok: true, nilai: 'Positif' };
  return { ok: false };
}