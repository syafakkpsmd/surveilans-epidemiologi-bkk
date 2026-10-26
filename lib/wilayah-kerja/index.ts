// lib/wilayah-kerja/index.ts
// SATU-SATUNYA sumber daftar wilayah kerja BKK Kelas I Samarinda di kode (WK01-WK07).
// Murni (tanpa impor database), aman dipakai komponen 'use client'.
//
// Kunci baku = `kode` (WK01..WK07). Nama lain hanyalah bentuk tampilan/penulisan dari kode yang sama:
//   nama       : nama resmi panjang   ("Pelabuhan Tanjung Santan", "Bandara APT Pranoto")
//   namaPendek : nama pendek di data  ("Tanjung Santan", "APT Pranoto")
//   namaPeta   : label di modul peta  ("Tanjung Santan", "Bandara APT Pranoto")
// Koordinat TIDAK ada di sini (lihat lib/data/wilker-lokasi.ts dan tabel wilker_ref).
// Daftar ini harus sama dengan tabel `wilker_ref` di database; skrip uji-wilayah-kerja.ts memeriksa kesamaannya.

export const WILAYAH_KERJA = [
  { kode: 'WK01', nama: 'Pelabuhan Samarinda', namaPendek: 'Samarinda', namaPeta: 'Samarinda', jenis: 'Pelabuhan' },
  { kode: 'WK02', nama: 'Pelabuhan Tanjung Santan', namaPendek: 'Tanjung Santan', namaPeta: 'Tanjung Santan', jenis: 'Pelabuhan' },
  { kode: 'WK03', nama: 'Pelabuhan Tanjung Laut', namaPendek: 'Tanjung Laut', namaPeta: 'Tanjung Laut', jenis: 'Pelabuhan' },
  { kode: 'WK04', nama: 'Pelabuhan Lhoktuan', namaPendek: 'Lhoktuan', namaPeta: 'Lhoktuan', jenis: 'Pelabuhan' },
  { kode: 'WK05', nama: 'Pelabuhan Sangatta', namaPendek: 'Sangatta', namaPeta: 'Sangatta', jenis: 'Pelabuhan' },
  { kode: 'WK06', nama: 'Pelabuhan Sangkulirang', namaPendek: 'Sangkulirang', namaPeta: 'Sangkulirang', jenis: 'Pelabuhan' },
  { kode: 'WK07', nama: 'Bandara APT Pranoto', namaPendek: 'APT Pranoto', namaPeta: 'Bandara APT Pranoto', jenis: 'Bandara' },
] as const;

export type Wilayah = (typeof WILAYAH_KERJA)[number];
export type KodeWilker = Wilayah['kode'];
export type JenisWilker = Wilayah['jenis'];

export const DAFTAR_KODE_WILKER: KodeWilker[] = WILAYAH_KERJA.map((w) => w.kode);

/** { WK01: 'Samarinda', ... } */
export const NAMA_PENDEK_BY_KODE: Record<string, string> = Object.fromEntries(WILAYAH_KERJA.map((w) => [w.kode, w.namaPendek]));
/** { WK01: 'Pelabuhan Samarinda', ..., WK07: 'Bandara APT Pranoto' } */
export const NAMA_PANJANG_BY_KODE: Record<string, string> = Object.fromEntries(WILAYAH_KERJA.map((w) => [w.kode, w.nama]));
/** Opsi untuk pemilih wilayah di modul peta: [{ kode, nama }] */
export const OPSI_WILKER_PETA: { kode: string; nama: string }[] = WILAYAH_KERJA.map((w) => ({ kode: w.kode, nama: w.namaPeta }));

/** Kunci pembanding: huruf kecil, tanpa spasi/garis bawah/titik/strip. "Tanjung_Santan" == "TanjungSantan" == "tanjung santan". */
function kunci(teks: string): string {
  return teks.toLowerCase().replace(/[\s_.\-]+/g, '');
}

const PETA_ALIAS = new Map<string, KodeWilker>();
for (const w of WILAYAH_KERJA) {
  const bentuk: string[] = [w.kode, w.nama, w.namaPendek, w.namaPeta];
  if (w.jenis === 'Pelabuhan') bentuk.push(`Pelabuhan ${w.namaPendek}`, `Pelabuhan Laut ${w.namaPendek}`);
  for (const b of bentuk) PETA_ALIAS.set(kunci(b), w.kode);
}

/**
 * Terjemahkan penulisan apa pun (kode, nama panjang/pendek, "TanjungSantan", "Tanjung_Santan",
 * "Pelabuhan Laut Sangatta", ...) menjadi kode baku. Mengembalikan null bila TIDAK dikenal;
 * pemanggil wajib menolak/ melaporkan, jangan menebak ("Tg. Laut" sengaja tidak dikenali).
 */
export function kodeDariTeks(teks: string | null | undefined): KodeWilker | null {
  if (teks == null) return null;
  const k = kunci(String(teks).trim());
  return k ? (PETA_ALIAS.get(k) ?? null) : null;
}

export function isKodeWilker(x: unknown): x is KodeWilker {
  return typeof x === 'string' && (DAFTAR_KODE_WILKER as string[]).includes(x);
}

export function dapatkanWilayah(kode: string | null | undefined): Wilayah | undefined {
  return WILAYAH_KERJA.find((w) => w.kode === kode);
}

export function namaDariKode(kode: string | null | undefined, bentuk: 'panjang' | 'pendek' | 'peta' = 'panjang'): string | undefined {
  const w = dapatkanWilayah(kode);
  if (!w) return undefined;
  return bentuk === 'pendek' ? w.namaPendek : bentuk === 'peta' ? w.namaPeta : w.nama;
}
