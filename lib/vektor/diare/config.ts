// lib/vektor/diare/config.ts
// Aman diimpor client maupun server (tanpa import server).
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

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

export const OPSI_WILAYAH: { kode: string; nama: string }[] = WILAYAH_KERJA.map((w) => ({
  kode: w.kode,
  nama: w.nama,
}));
export const KODE_WILAYAH: string[] = OPSI_WILAYAH.map((w) => w.kode);
export const NAMA_WILAYAH: Record<string, string> = Object.fromEntries(OPSI_WILAYAH.map((w) => [w.kode, w.nama]));

// Kunci pembanding nama wilayah: buang kata umum, aksen, dan tanda baca.
function kunci(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(pelabuhan|bandara|bandar udara|apt|airport|port)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

/** "Samarinda", "APT Pranoto", "Tanjung Santan" atau "WK02" -> kode baku; null bila tidak dikenali. */
export function petakanWilayah(teks: string): string | null {
  const t = teks.trim();
  if (!t) return null;
  const kode = t.toUpperCase();
  if (KODE_WILAYAH.includes(kode)) return kode;

  const k = kunci(t);
  if (!k) return null;
  const sama = WILAYAH_KERJA.filter((w) => kunci(w.nama) === k);
  if (sama.length === 1) return sama[0].kode;

  const mirip = WILAYAH_KERJA.filter((w) => {
    const kw = kunci(w.nama);
    return kw && (kw.includes(k) || k.includes(kw));
  });
  return mirip.length === 1 ? mirip[0].kode : null;
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