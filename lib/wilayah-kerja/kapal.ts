// lib/wilayah-kerja/kapal.ts
// Turunan murni (aman untuk 'use client') untuk modul yang memetakan data kapal per wilayah kerja
// (COP, PHQC, alat angkut, simulasi wabah, ABK). Menggantikan daftar nama tertulis seperti
// ["Samarinda", "TanjungSantan", ...] dan peta ejaan PHQC ("Pelabuhan Laut Sangatta").
import { kunciNama, type JenisWilker, type Wilayah } from './index';

export interface WilayahKapal {
  /** Kunci tanpa spasi, sama dengan isi kolom wilayah_kerja yang ditulis pipeline input ("TanjungSantan"). */
  value: string;
  /** Nama pendek ("Tanjung Santan"). */
  nama: string;
  /** Nama resmi ("Pelabuhan Tanjung Santan"). */
  namaResmi: string;
  kode: string;
  /** Semua ejaan yang mungkin tersimpan di data (kunci, nama pendek/resmi, "Pelabuhan Laut X", alias dari wilker_nama_alias). */
  variants: string[];
}

export function kunciTersimpan(w: Pick<Wilayah, 'namaPendek'>): string {
  return w.namaPendek.replace(/\s+/g, '');
}

/** Wilayah AKTIF dengan jenis tertentu (bawaan: pelabuhan), terurut. */
export function daftarWilayahKapal(daftar: readonly Wilayah[], jenis: readonly JenisWilker[] = ['Pelabuhan']): WilayahKapal[] {
  return [...daftar]
    .filter((w) => w.aktif && jenis.includes(w.jenis))
    .sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode))
    .map((w) => {
      const bentuk = [kunciTersimpan(w), w.namaPendek, w.nama, w.namaPeta, ...w.alias];
      if (w.jenis === 'Pelabuhan') bentuk.push(`Pelabuhan ${w.namaPendek}`, `Pelabuhan Laut ${w.namaPendek}`);
      return { value: kunciTersimpan(w), nama: w.namaPendek, namaResmi: w.nama, kode: w.kode, variants: [...new Set(bentuk)] };
    });
}

/** Apakah teks wilayah dari data (apa pun ejaannya) milik wilayah ini? Setara aturan lama "sama persis atau memuat nama wilayahnya". */
export function cocokWilayahKapal(teks: string | null | undefined, w: Pick<WilayahKapal, 'value' | 'variants'>): boolean {
  if (!teks) return false;
  const bersih = kunciNama(teks);
  return bersih.includes(kunciNama(w.value)) || w.variants.some((v) => kunciNama(v) === bersih);
}

/** Cari wilayah dari nilai parameter URL (kunci atau ejaan lain); tidak dikenal -> undefined. */
export function cariWilayahKapal(nilai: string | undefined | null, daftar: readonly WilayahKapal[]): WilayahKapal | undefined {
  if (!nilai) return undefined;
  const k = kunciNama(nilai);
  return daftar.find((w) => kunciNama(w.value) === k) ?? daftar.find((w) => w.variants.some((v) => kunciNama(v) === k));
}
