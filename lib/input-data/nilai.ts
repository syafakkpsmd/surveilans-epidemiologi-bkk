// lib/input-data/nilai.ts
// Pengubah nilai sel -> nilai tersimpan. MURNI, mudah diuji. Setiap fungsi mengembalikan
// { ok: true, nilai } atau { ok: false, galat } (galat berupa kalimat untuk pengguna; tanpa nilai data).
import { kodeDariTeks, type KodeWilker } from '@/lib/wilayah-kerja';

export type Hasil<T> = { ok: true; nilai: T } | { ok: false; galat: string };

const ok = <T,>(nilai: T): Hasil<T> => ({ ok: true, nilai });
const gagal = (galat: string): Hasil<never> => ({ ok: false, galat });

/** Sel mentah dari exceljs -> primitif: teks, angka, Date, atau null. */
export function selMentah(v: unknown): string | number | Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((r) => r.text ?? '').join('');
    if ('result' in o) return selMentah(o.result);
    if (typeof o.text === 'string') return o.text; // hyperlink
    if ('error' in o) return null;
  }
  return null;
}

export function teksKosong(v: unknown): boolean {
  const m = selMentah(v);
  return m === null || (typeof m === 'string' && m.trim() === '');
}

export function ubahTeks(v: unknown, maks = 255): Hasil<string | null> {
  const m = selMentah(v);
  if (m === null) return ok(null);
  const s = (m instanceof Date ? m.toISOString().slice(0, 10) : String(m)).replace(/\s+/g, ' ').trim();
  if (s === '') return ok(null);
  if ([...s].length > maks) return gagal(`teks lebih panjang dari ${maks} karakter`);
  return ok(s);
}

export function ubahBilangan(v: unknown): Hasil<number | null> {
  const m = selMentah(v);
  if (m === null) return ok(null);
  let n: number;
  if (typeof m === 'number') n = m;
  else if (m instanceof Date) return gagal('bukan bilangan bulat');
  else {
    const s = m.trim();
    if (s === '' || s === '-') return ok(null);
    if (!/^-?\d+([.,]0+)?$/.test(s)) return gagal('bukan bilangan bulat');
    n = Number(s.replace(',', '.'));
  }
  if (!Number.isInteger(n)) return gagal('bukan bilangan bulat');
  if (n < 0) return gagal('tidak boleh negatif');
  if (n > 2_000_000_000) return gagal('terlalu besar');
  return ok(n);
}

function tanggalValid(t: number, b: number, h: number): string | null {
  if (t < 1990 || t > 2100) return null;
  const d = new Date(Date.UTC(t, b - 1, h));
  if (d.getUTCFullYear() !== t || d.getUTCMonth() !== b - 1 || d.getUTCDate() !== h) return null;
  return `${t}-${String(b).padStart(2, '0')}-${String(h).padStart(2, '0')}`;
}

/** Terima: Date (sel tanggal Excel), nomor seri Excel, 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY'.
 *  Urutan hari-bulan (Indonesia); 'MM/DD/YYYY' TIDAK ditebak. Hasil 'YYYY-MM-DD'. */
export function ubahTanggal(v: unknown): Hasil<string | null> {
  const m = selMentah(v);
  if (m === null) return ok(null);
  if (m instanceof Date) {
    if (Number.isNaN(m.getTime())) return gagal('tanggal tidak valid');
    // exceljs memberi Date pada 00:00 UTC untuk sel tanggal murni; ambil komponen UTC.
    const r = tanggalValid(m.getUTCFullYear(), m.getUTCMonth() + 1, m.getUTCDate());
    return r ? ok(r) : gagal('tanggal tidak valid');
  }
  if (typeof m === 'number') {
    if (m < 30000 || m > 80000) return gagal('tanggal tidak dikenal');
    const d = new Date(Math.round((m - 25569) * 86400000)); // nomor seri Excel (sistem 1900)
    const r = tanggalValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    return r ? ok(r) : gagal('tanggal tidak valid');
  }
  const s = m.trim();
  if (s === '') return ok(null);
  let g = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (g) {
    const r = tanggalValid(+g[1], +g[2], +g[3]);
    return r ? ok(r) : gagal('tanggal tidak ada di kalender');
  }
  g = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s);
  if (g) {
    const r = tanggalValid(+g[3], +g[2], +g[1]);
    return r ? ok(r) : gagal('tanggal tidak ada di kalender (format hari/bulan/tahun)');
  }
  return gagal('format tanggal tidak dikenal (pakai TTTT-BB-HH atau HH/BB/TTTT)');
}

const RBA: Record<string, 'Hijau' | 'Kuning' | 'Merah'> = { hijau: 'Hijau', kuning: 'Kuning', merah: 'Merah' };

export function ubahRba(v: unknown): Hasil<string | null> {
  const t = ubahTeks(v, 50);
  if (!t.ok) return t;
  if (t.nilai === null) return ok(null);
  const r = RBA[t.nilai.toLowerCase()];
  return r ? ok(r) : gagal('RBA harus Hijau, Kuning, atau Merah');
}

export function ubahWilker(v: unknown): Hasil<KodeWilker | null> {
  const t = ubahTeks(v, 100);
  if (!t.ok) return t;
  if (t.nilai === null) return ok(null);
  const k = kodeDariTeks(t.nilai);
  return k ? ok(k) : gagal('wilayah kerja tidak dikenal');
}
