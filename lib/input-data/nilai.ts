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

const RBA: Record<string, 'Hijau' | 'Kuning' | 'Merah'> = {
  hijau: 'Hijau', kuning: 'Kuning', merah: 'Merah',
  rendah: 'Hijau', sedang: 'Kuning', tinggi: 'Merah',
  'risiko rendah': 'Hijau', 'risiko sedang': 'Kuning', 'risiko tinggi': 'Merah',
  'rendah (hijau)': 'Hijau', 'sedang (kuning)': 'Kuning', 'tinggi (merah)': 'Merah',
};

export function ubahRba(v: unknown): Hasil<string | null> {
  const t = ubahTeks(v, 50);
  if (!t.ok) return t;
  if (t.nilai === null) return ok(null);
  const r = RBA[t.nilai.toLowerCase()];
  return r ? ok(r) : gagal('RBA harus Rendah (Hijau), Sedang (Kuning), atau Tinggi (Merah)');
}

/** Bilangan desimal (titik sebagai pemisah desimal; "1.234,5" gaya Indonesia TIDAK ditebak). Maks 2 desimal. */
export function ubahDesimal(v: unknown): Hasil<number | null> {
  const m = selMentah(v);
  if (m === null) return ok(null);
  let n: number;
  if (typeof m === 'number') n = m;
  else if (m instanceof Date) return gagal('bukan bilangan');
  else {
    const s = m.trim();
    if (s === '' || s === '-') return ok(null);
    if (!/^-?\d+(\.\d+)?$/.test(s)) return gagal('bukan bilangan (pakai titik untuk desimal, tanpa pemisah ribuan)');
    n = Number(s);
  }
  if (!Number.isFinite(n)) return gagal('bukan bilangan');
  if (n < 0) return gagal('tidak boleh negatif');
  if (n > 9_999_999_999) return gagal('terlalu besar');
  return ok(Math.round(n * 100) / 100);
}

/** Jam: 'H:MM', 'HH:MM', 'HH:MM:SS', pecahan hari Excel (0..1), atau Date. Hasil 'HH:MM:SS'. */
export function ubahWaktu(v: unknown): Hasil<string | null> {
  const m = selMentah(v);
  if (m === null) return ok(null);
  const p = (n: number) => String(n).padStart(2, '0');
  if (m instanceof Date) return ok(`${p(m.getUTCHours())}:${p(m.getUTCMinutes())}:${p(m.getUTCSeconds())}`);
  if (typeof m === 'number') {
    if (m < 0 || m >= 1) return gagal('jam tidak dikenal');
    const det = Math.round(m * 86400);
    return ok(`${p(Math.floor(det / 3600) % 24)}:${p(Math.floor(det / 60) % 60)}:${p(det % 60)}`);
  }
  const s = m.trim();
  if (s === '') return ok(null);
  const g = /^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/.exec(s);
  if (!g || +g[1] > 23 || +g[2] > 59 || (g[3] !== undefined && +g[3] > 59)) return gagal('format jam tidak dikenal (pakai JJ:MM)');
  return ok(`${p(+g[1])}:${g[2]}:${g[3] ?? '00'}`);
}

/** Tanggal+jam: 'YYYY-MM-DD HH:MM[:SS]', 'DD/MM/YYYY HH:MM', Date, atau tanggal saja (jam 00:00:00). Hasil 'YYYY-MM-DD HH:MM:SS'. Waktu dipakai apa adanya (WITA dari Sinkarkes). */
export function ubahTanggalWaktu(v: unknown): Hasil<string | null> {
  const m = selMentah(v);
  if (m === null) return ok(null);
  if (m instanceof Date) {
    const t = ubahTanggal(m);
    if (!t.ok || t.nilai === null) return t;
    const w = ubahWaktu(m);
    return ok(`${t.nilai} ${w.ok && w.nilai ? w.nilai : '00:00:00'}`);
  }
  if (typeof m === 'number') {
    const t = ubahTanggal(Math.floor(m));
    if (!t.ok || t.nilai === null) return t;
    const w = ubahWaktu(m - Math.floor(m));
    return ok(`${t.nilai} ${w.ok && w.nilai ? w.nilai : '00:00:00'}`);
  }
  const s = m.trim();
  if (s === '') return ok(null);
  const g = /^(.+?)(?:[ T]+(\d{1,2}[:.]\d{2}(?::\d{2})?))?$/.exec(s);
  if (!g) return gagal('format tanggal dan jam tidak dikenal');
  const t = ubahTanggal(g[1]);
  if (!t.ok || t.nilai === null) return t.ok ? gagal('tanggal kosong') : t;
  const w = g[2] ? ubahWaktu(g[2]) : ok<string | null>('00:00:00');
  if (!w.ok) return w;
  return ok(`${t.nilai} ${w.nilai ?? '00:00:00'}`);
}

export function ubahWilker(v: unknown): Hasil<KodeWilker | null> {
  const t = ubahTeks(v, 100);
  if (!t.ok) return t;
  if (t.nilai === null) return ok(null);
  const k = kodeDariTeks(t.nilai);
  return k ? ok(k) : gagal('wilayah kerja tidak dikenal');
}
