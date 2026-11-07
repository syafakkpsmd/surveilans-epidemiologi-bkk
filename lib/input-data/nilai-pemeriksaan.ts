// lib/input-data/nilai-pemeriksaan.ts  (FILE BARU)
// Pengubah nilai untuk tipe kolom 'ya_tidak' (butir formulir pemeriksaan). MURNI.
// Hasil tersimpan selalu 'Ya' | 'Tidak' | 'N/A' | null (kosong = belum diisi, TIDAK dianggap Tidak).
import { NILAI_BUTIR } from '@/lib/limbah-b3/butir';

const YA = new Set(['ya', 'y', 'yes', 'ok', 'sesuai', 'memenuhi', 'v', '✓', '✔', '☑', 'true', '1']);
const TIDAK = new Set(['tidak', 'tdk', 't', 'no', 'tidak sesuai', 'x', '✗', '✘', '☒', 'false', '0']);
const NA = new Set(['n/a', 'na', 'n.a', 'n.a.', 'tidak berlaku', 'tb', '-', '–', '—']);

export function ubahYaTidak(v: unknown): { ok: true; nilai: string | null } | { ok: false; galat: string } {
  if (v === null || v === undefined) return { ok: true, nilai: null };
  if (typeof v === 'boolean') return { ok: true, nilai: v ? 'Ya' : 'Tidak' };
  const s = String(v).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return { ok: true, nilai: null };
  if (YA.has(s)) return { ok: true, nilai: 'Ya' };
  if (TIDAK.has(s)) return { ok: true, nilai: 'Tidak' };
  if (NA.has(s)) return { ok: true, nilai: 'N/A' };
  return { ok: false, galat: `harus ${NILAI_BUTIR.join(', ')} (atau dikosongkan bila belum dinilai)` };
}
