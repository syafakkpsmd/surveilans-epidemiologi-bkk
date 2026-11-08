// lib/wilayah-kerja/server.ts
// SERVER-ONLY. Membaca daftar wilayah kerja dari tabel `wilker_ref` (+ alias dari `wilker_nama_alias`).
// Hasil di-cache dan dibatalkan otomatis saat admin mengubah wilayah kerja (tag 'wilker').
import 'server-only';
import { unstable_cache } from 'next/cache';
import { buatKamus, type KamusWilker, type Wilayah } from './index';
import { bacaDariDb, bacaModulDariDb, susunDaftarWilayah } from './db';
import { DAFTAR_KUNCI_MODUL, petaModulKosong, type KunciModulWilker, type PetaModulWilker } from './modul';

export const TAG_WILKER = 'wilker';

const bacaTerCache = unstable_cache(bacaDariDb, ['wilker-ref-v1'], { tags: [TAG_WILKER], revalidate: 600 });

/** Semua wilayah kerja (termasuk yang nonaktif), terurut. */
export async function getDaftarWilker(): Promise<Wilayah[]> {
  const { baris, alias } = await bacaTerCache();
  return susunDaftarWilayah(baris, alias);
}

/** Kamus siap pakai: kamus.aktif untuk dropdown, kamus.kodeDariTeks(...) untuk memetakan teks lama. */
export async function getKamusWilker(): Promise<KamusWilker> {
  return buatKamus(await getDaftarWilker());
}

// ---------------------------------------------------------------------------------------------
// Modul per wilayah (tabel wilker_modul)
// ---------------------------------------------------------------------------------------------

const bacaModulTerCache = unstable_cache(bacaModulDariDb, ['wilker-modul-v1'], { tags: [TAG_WILKER], revalidate: 600 });

/** { poliklinik: ['WK01', 'WK03', ...], tb: [...], ... } (semua wilayah yang dicentang, termasuk nonaktif). */
export async function getPetaModulWilker(): Promise<PetaModulWilker> {
  const peta = petaModulKosong();
  for (const r of await bacaModulTerCache()) {
    if ((DAFTAR_KUNCI_MODUL as readonly string[]).includes(r.modul)) peta[r.modul as KunciModulWilker].push(r.kode);
  }
  return peta;
}

/** Wilayah AKTIF yang menjalankan modul ini, terurut. Dasar untuk dropdown, kolom chart, dan baris tabel modul. */
export async function getWilkerModul(modul: KunciModulWilker): Promise<Wilayah[]> {
  const [daftar, peta] = await Promise.all([getDaftarWilker(), getPetaModulWilker()]);
  const dipakai = new Set(peta[modul]);
  return daftar.filter((w) => w.aktif && dipakai.has(w.kode));
}

/** Nama pendek wilayah untuk modul ini (sama dengan isi kolom `wilayah_kerja` di tabel data modul). */
export async function getNamaWilkerModul(modul: KunciModulWilker): Promise<string[]> {
  return (await getWilkerModul(modul)).map((w) => w.namaPendek);
}

/**
 * Wilayah AKTIF yang memakai filter Zona & Sub-lokasi di halaman Vektor (modul "vektor_sub_lokasi") beserta
 * daftar sub-lokasinya (kolom wilker_ref.sub_lokasi). Menggantikan aturan yang dulu terkunci ke WK01.
 */
export async function getWilayahSubLokasiVektor(): Promise<{ kode: string; subLokasi: string[] }[]> {
  return (await getWilkerModul('vektor_sub_lokasi'))
    .filter((w) => w.subLokasi.length > 0)
    .map((w) => ({ kode: w.kode, subLokasi: w.subLokasi }));
}
