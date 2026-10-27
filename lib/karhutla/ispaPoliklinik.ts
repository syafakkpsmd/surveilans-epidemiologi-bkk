// lib/karhutla/ispaPoliklinik.ts
// Sumber data ISPA otomatis dari modul Kunjungan Poliklinik (Turso) untuk zona klinik tertentu.
// HANYA untuk server (Server Component / Route Handler / Server Action).
//
// Aturan:
//  - kasus ISPA = kunjungan poliklinik yang kolom `diagnosa`-nya mengandung kata ISPA
//    (juga salah ketik "ISPAA"); "DISPAREUNIA" dsb. TIDAK ikut karena dicek per kata.
//  - umur dibagi: anak = usia < BATAS_UMUR_ANAK tahun, dewasa = usia >= BATAS_UMUR_ANAK
//    (usia kosong/tidak terbaca dihitung dewasa).
//  - Tanggal yang ADA kunjungan poliklinik: data ISPA zona itu diambil dari poliklinik (0 bila tidak
//    ada kasus ISPA). Tanggal tanpa kunjungan sama sekali: tetap memakai input manual ispa_harian.
import { getDbClient } from '@/lib/db/client';

/** Anak = usia di bawah angka ini (tahun). UBAH di sini bila batas anak/dewasa Karhutla berbeda. */
export const BATAS_UMUR_ANAK = 15;

/** Zona Karhutla yang datanya diambil dari poliklinik. Tambahkan baris lain bila ingin diperluas. */
export const ZONA_ISPA_DARI_POLIKLINIK = [
  { kode_wilker: 'WK01', zona: 'Klinik Pelabuhan Samarinda', wilayahPoliklinik: 'samarinda' },
] as const;

export type BarisIspaPoliklinik = {
  tanggal: string;
  kode_wilker: string;
  zona: string;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
};

export type HasilIspaPoliklinik = {
  /** false bila Turso gagal -> pemanggil memakai data manual apa adanya */
  tersedia: boolean;
  /** 1 baris per tanggal yang ada kunjungan (kasus ISPA bisa 0) */
  baris: BarisIspaPoliklinik[];
};

export function adalahDiagnosaIspa(diagnosa: unknown): boolean {
  return /\bISPA+\b/i.test(String(diagnosa ?? ''));
}

export function klasifikasiUmur(usia: unknown): 'anak' | 'dewasa' {
  const angka = parseInt(String(usia ?? '').match(/\d+/)?.[0] ?? '', 10);
  return Number.isFinite(angka) && angka < BATAS_UMUR_ANAK ? 'anak' : 'dewasa';
}

export const SQL_ISPA_POLIKLINIK =
  `SELECT date(tanggal_pemeriksaan) AS tgl, usia, diagnosa
   FROM kunjungan_poliklinik
   WHERE REPLACE(LOWER(wilayah_kerja), ' ', '') = ?
     AND date(tanggal_pemeriksaan) BETWEEN ? AND ?`;

export async function ambilIspaDariPoliklinik(
  tanggalAwal: string,
  tanggalAkhir: string
): Promise<HasilIspaPoliklinik> {
  try {
    const baris: BarisIspaPoliklinik[] = [];
    for (const z of ZONA_ISPA_DARI_POLIKLINIK) {
      const hasil = await getDbClient().execute({
        sql: SQL_ISPA_POLIKLINIK,
        args: [z.wilayahPoliklinik, tanggalAwal, tanggalAkhir],
      });
      const perTanggal = new Map<string, { anak: number; dewasa: number }>();
      for (const r of hasil.rows as unknown as Record<string, unknown>[]) {
        const tgl = String(r.tgl ?? '');
        if (!tgl) continue;
        const entri = perTanggal.get(tgl) ?? { anak: 0, dewasa: 0 };
        if (adalahDiagnosaIspa(r.diagnosa)) entri[klasifikasiUmur(r.usia)] += 1;
        perTanggal.set(tgl, entri);
      }
      perTanggal.forEach((v, tgl) =>
        baris.push({
          tanggal: tgl, kode_wilker: z.kode_wilker, zona: z.zona,
          kasus_ispa_anak: v.anak, kasus_ispa_dewasa: v.dewasa,
        })
      );
    }
    return { tersedia: true, baris };
  } catch (err) {
    console.error('[karhutla] ISPA poliklinik gagal dimuat, memakai input manual:', err);
    return { tersedia: false, baris: [] };
  }
}

type DasarIspa = { tanggal: string; kode_wilker: string; zona: string | null };

/**
 * Menggabungkan baris ISPA manual (ispa_harian) dengan data poliklinik:
 * baris manual zona terkait DIBUANG pada tanggal yang punya kunjungan poliklinik, lalu baris
 * poliklinik ditambahkan. `lolos` = filter wilayah yang sama dengan filter query manual.
 */
export function gabungkanIspaPoliklinik<T extends DasarIspa>(
  manual: T[],
  poli: HasilIspaPoliklinik,
  buat: (b: BarisIspaPoliklinik) => T,
  lolos?: (kode_wilker: string, zona: string) => boolean
): T[] {
  if (!poli.tersedia) return manual;
  const diganti = new Set(poli.baris.map((b) => `${b.kode_wilker}::${b.zona}|${b.tanggal}`));
  const sisa = manual.filter((r) => !diganti.has(`${r.kode_wilker}::${r.zona ?? ''}|${r.tanggal}`));
  const tambahan = poli.baris.filter((b) => !lolos || lolos(b.kode_wilker, b.zona)).map(buat);
  return [...sisa, ...tambahan];
}

/** Padanan filter `wilayahKeys` ('WK01' atau 'WK01::Nama Zona') untuk baris poliklinik. */
export function lolosWilayahKeys(wilayahKeys?: string[]) {
  return (kode: string, zona: string) =>
    !wilayahKeys || wilayahKeys.length === 0 || wilayahKeys.includes(`${kode}::${zona}`);
}

/** Padanan filter `.in('kode_wilker', [...])`. */
export function lolosKodeWilker(kodeWilker: readonly string[]) {
  return (kode: string) => kodeWilker.includes(kode);
}
