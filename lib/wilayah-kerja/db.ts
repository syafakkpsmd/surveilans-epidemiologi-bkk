// lib/wilayah-kerja/db.ts
// Pembacaan wilker_ref / wilker_nama_alias / wilker_modul LANGSUNG dari database, tanpa cache Next.js dan tanpa
// 'server-only', supaya bisa dipakai jalur tulis (simpan data) dan skrip uji (tsx). Halaman dan komponen server
// memakai lib/wilayah-kerja/server.ts (di-cache, otomatis segar saat admin mengubah pengaturan).
import { getDbClient } from '@/lib/db/client';
import { normalisasiWilayah, type Wilayah } from './index';

export interface BarisMentah extends Record<string, unknown> {
  kode: string;
}

export async function bacaDariDb(): Promise<{ baris: BarisMentah[]; alias: { teks: string; kode: string }[] }> {
  const db = getDbClient();
  let baris: BarisMentah[];
  try {
    baris = (
      await db.execute(
        `SELECT kode, nama, jenis, lat, lng, sub_lokasi, catatan, nama_pendek, nama_peta, warna, urutan, aktif
           FROM wilker_ref ORDER BY urutan ASC, kode ASC`
      )
    ).rows as BarisMentah[];
  } catch (e: unknown) {
    // 42703 = kolom belum ada (migrasi 20_wilker_ref_sumber_tunggal.sql belum dijalankan): pakai kolom lama.
    if ((e as { code?: string })?.code !== '42703') throw e;
    console.error('[wilayah-kerja] Kolom baru wilker_ref belum ada; jalankan scripts/migrate/20_wilker_ref_sumber_tunggal.sql');
    baris = (
      await db.execute(`SELECT kode, nama, jenis, lat, lng, sub_lokasi, catatan FROM wilker_ref ORDER BY kode ASC`)
    ).rows as BarisMentah[];
  }
  const alias = (await db.execute(`SELECT wilayah_kerja_teks AS teks, kode_wilker AS kode FROM wilker_nama_alias`)).rows as {
    teks: string;
    kode: string;
  }[];
  return { baris, alias };
}

/** Susun Wilayah[] dari hasil bacaDariDb(). */
export function susunDaftarWilayah(baris: BarisMentah[], alias: { teks: string; kode: string }[]): Wilayah[] {
  const aliasPerKode = new Map<string, string[]>();
  for (const a of alias) (aliasPerKode.get(a.kode) ?? aliasPerKode.set(a.kode, []).get(a.kode)!).push(a.teks);
  return baris.map((b) => normalisasiWilayah(b, aliasPerKode.get(b.kode) ?? []));
}

/** Daftar wilayah kerja terkini langsung dari database (termasuk yang nonaktif), terurut. */
export async function muatDaftarWilayahLangsung(): Promise<Wilayah[]> {
  const { baris, alias } = await bacaDariDb();
  return susunDaftarWilayah(baris, alias);
}

export async function bacaModulDariDb(): Promise<{ kode: string; modul: string }[]> {
  try {
    const { rows } = await getDbClient().execute(`SELECT kode_wilker AS kode, modul FROM wilker_modul`);
    return rows as { kode: string; modul: string }[];
  } catch (e: unknown) {
    // 42P01 = tabel belum ada (migrasi 22_wilker_modul.sql belum dijalankan).
    if ((e as { code?: string })?.code !== '42P01') throw e;
    console.error('[wilayah-kerja] Tabel wilker_modul belum ada; jalankan scripts/migrate/22_wilker_modul.sql');
    return [];
  }
}
