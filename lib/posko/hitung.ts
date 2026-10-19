// lib/posko/hitung.ts
// Fungsi hitung murni (tanpa akses database) untuk dashboard & infografis Posko.
import {
  DAFTAR_PENYAKIT,
  DAFTAR_PTM,
  WILAYAH_POSKO,
  type BarisHarianPosko,
  type BarisPenyakitPosko,
  type BarisPtmPosko,
  type WilayahPosko,
} from './konstanta';

export type FilterPosko = {
  wilayah?: WilayahPosko | null; // null/undefined = semua wilayah
  dari?: string; // YYYY-MM-DD (inklusif)
  sampai?: string; // YYYY-MM-DD (inklusif)
};

function lolos(b: { tanggal: string; wilayah: WilayahPosko }, f: FilterPosko): boolean {
  if (f.wilayah && b.wilayah !== f.wilayah) return false;
  if (f.dari && b.tanggal < f.dari) return false;
  if (f.sampai && b.tanggal > f.sampai) return false;
  return true;
}

export const saringHarian = (rows: BarisHarianPosko[], f: FilterPosko) => rows.filter((r) => lolos(r, f));
export const saringPenyakit = (rows: BarisPenyakitPosko[], f: FilterPosko) => rows.filter((r) => lolos(r, f));
export const saringPtm = (rows: BarisPtmPosko[], f: FilterPosko) => rows.filter((r) => lolos(r, f));

// ------------------------------------------------------------ ringkasan harian
export type TotalHarian = {
  poliklinik: number;
  kapalDatang: number;
  kapalBerangkat: number;
  pesawatDatang: number;
  pesawatBerangkat: number;
  alatAngkutDatang: number;
  alatAngkutBerangkat: number;
  alatAngkutTotal: number;
  abkDatang: number;
  abkBerangkat: number;
  penumpangKapalDatang: number;
  penumpangKapalBerangkat: number;
  crewDatang: number;
  crewBerangkat: number;
  penumpangPesawatDatang: number;
  penumpangPesawatBerangkat: number;
  orangDatang: number;
  orangBerangkat: number;
  jumlahKlb: number;
};

/** Orang datang = ABK kapal + penumpang kapal + crew pesawat + penumpang pesawat (arah datang). */
export const orangDatang = (r: BarisHarianPosko) =>
  r.abkDatang + r.penumpangKapalDatang + r.crewDatang + r.penumpangPesawatDatang;

/** Orang berangkat = ABK kapal + penumpang kapal + crew pesawat + penumpang pesawat (arah berangkat). */
export const orangBerangkat = (r: BarisHarianPosko) =>
  r.abkBerangkat + r.penumpangKapalBerangkat + r.crewBerangkat + r.penumpangPesawatBerangkat;

export function jumlahkanHarian(rows: BarisHarianPosko[]): TotalHarian {
  const t: TotalHarian = {
    poliklinik: 0, kapalDatang: 0, kapalBerangkat: 0, pesawatDatang: 0, pesawatBerangkat: 0,
    alatAngkutDatang: 0, alatAngkutBerangkat: 0, alatAngkutTotal: 0,
    abkDatang: 0, abkBerangkat: 0, penumpangKapalDatang: 0, penumpangKapalBerangkat: 0,
    crewDatang: 0, crewBerangkat: 0, penumpangPesawatDatang: 0, penumpangPesawatBerangkat: 0,
    orangDatang: 0, orangBerangkat: 0, jumlahKlb: 0,
  };
  for (const r of rows) {
    t.poliklinik += r.poliklinik;
    t.kapalDatang += r.kapalDatang;
    t.kapalBerangkat += r.kapalBerangkat;
    t.pesawatDatang += r.pesawatDatang;
    t.pesawatBerangkat += r.pesawatBerangkat;
    t.abkDatang += r.abkDatang;
    t.abkBerangkat += r.abkBerangkat;
    t.penumpangKapalDatang += r.penumpangKapalDatang;
    t.penumpangKapalBerangkat += r.penumpangKapalBerangkat;
    t.crewDatang += r.crewDatang;
    t.crewBerangkat += r.crewBerangkat;
    t.penumpangPesawatDatang += r.penumpangPesawatDatang;
    t.penumpangPesawatBerangkat += r.penumpangPesawatBerangkat;
    t.jumlahKlb += r.jumlahKlb;
  }
  t.alatAngkutDatang = t.kapalDatang + t.pesawatDatang;
  t.alatAngkutBerangkat = t.kapalBerangkat + t.pesawatBerangkat;
  t.alatAngkutTotal = t.alatAngkutDatang + t.alatAngkutBerangkat;
  t.orangDatang = t.abkDatang + t.penumpangKapalDatang + t.crewDatang + t.penumpangPesawatDatang;
  t.orangBerangkat = t.abkBerangkat + t.penumpangKapalBerangkat + t.crewBerangkat + t.penumpangPesawatBerangkat;
  return t;
}

// ------------------------------------------------------------ penyakit potensial KLB
export type TotalPenyakit = {
  kasusLkLt5: number; kasusLkGe5: number; kasusPrLt5: number; kasusPrGe5: number; kasusTotal: number;
  matiLkLt5: number; matiLkGe5: number; matiPrLt5: number; matiPrGe5: number; matiTotal: number;
};

const kosongPenyakit = (): TotalPenyakit => ({
  kasusLkLt5: 0, kasusLkGe5: 0, kasusPrLt5: 0, kasusPrGe5: 0, kasusTotal: 0,
  matiLkLt5: 0, matiLkGe5: 0, matiPrLt5: 0, matiPrGe5: 0, matiTotal: 0,
});

function tambahPenyakit(t: TotalPenyakit, r: BarisPenyakitPosko) {
  t.kasusLkLt5 += r.kasusLkLt5; t.kasusLkGe5 += r.kasusLkGe5; t.kasusPrLt5 += r.kasusPrLt5; t.kasusPrGe5 += r.kasusPrGe5;
  t.matiLkLt5 += r.matiLkLt5; t.matiLkGe5 += r.matiLkGe5; t.matiPrLt5 += r.matiPrLt5; t.matiPrGe5 += r.matiPrGe5;
  t.kasusTotal = t.kasusLkLt5 + t.kasusLkGe5 + t.kasusPrLt5 + t.kasusPrGe5;
  t.matiTotal = t.matiLkLt5 + t.matiLkGe5 + t.matiPrLt5 + t.matiPrGe5;
}

/** Total per jenis penyakit (urutan sesuai DAFTAR_PENYAKIT) + total keseluruhan. */
export function ringkasPenyakit(rows: BarisPenyakitPosko[]) {
  const perJenis = new Map<string, TotalPenyakit>();
  DAFTAR_PENYAKIT.forEach((j) => perJenis.set(j, kosongPenyakit()));
  const total = kosongPenyakit();
  for (const r of rows) {
    const t = perJenis.get(r.jenis) ?? kosongPenyakit();
    perJenis.set(r.jenis, t);
    tambahPenyakit(t, r);
    tambahPenyakit(total, r);
  }
  return {
    perJenis: Array.from(perJenis.entries()).map(([jenis, t]) => ({ jenis, ...t })),
    total,
  };
}

/** Irisan donut jenis kelamin x umur. */
export function donutKelompok(t: TotalPenyakit, tipe: 'kasus' | 'mati') {
  const k = tipe === 'kasus'
    ? [t.kasusLkLt5, t.kasusLkGe5, t.kasusPrLt5, t.kasusPrGe5]
    : [t.matiLkLt5, t.matiLkGe5, t.matiPrLt5, t.matiPrGe5];
  return [
    { kategori: 'Laki-laki <5 th', jumlah: k[0] },
    { kategori: 'Laki-laki ≥5 th', jumlah: k[1] },
    { kategori: 'Perempuan <5 th', jumlah: k[2] },
    { kategori: 'Perempuan ≥5 th', jumlah: k[3] },
  ];
}

// ------------------------------------------------------------ PTM
export function ringkasPtm(rows: BarisPtmPosko[]) {
  const perJenis = new Map<string, number>();
  DAFTAR_PTM.forEach((j) => perJenis.set(j, 0));
  let total = 0;
  for (const r of rows) {
    perJenis.set(r.jenis, (perJenis.get(r.jenis) ?? 0) + r.jumlah);
    total += r.jumlah;
  }
  return { perJenis: Array.from(perJenis.entries()).map(([jenis, jumlah]) => ({ jenis, jumlah })), total };
}

// ------------------------------------------------------------ tren harian
export function daftarTanggal(rows: { tanggal: string }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.tanggal))).sort();
}

/** "2026-12-24" -> "24/12" */
export function tanggalPendek(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "2026-12-24" -> "24 Desember 2026" */
export function tanggalPanjang(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/** "2026-12-25" + 3 -> "2026-12-28" (n boleh negatif). Tanggal tak valid -> ''. */
export function tambahHari(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Hari ke-N sejak tanggal mulai (hari pertama = 1). */
export function hariKe(mulai: string, tanggal: string): number {
  return Math.round((Date.parse(`${tanggal}T00:00:00Z`) - Date.parse(`${mulai}T00:00:00Z`)) / 86400000) + 1;
}

export type TitikTren = { name: string; tanggal: string } & Record<string, number | string>;

/** Satu titik per tanggal; `ambil` menghasilkan kolom angka dari baris-baris tanggal itu. */
export function trenHarian<T extends { tanggal: string }>(
  rows: T[],
  ambil: (barisHariItu: T[]) => Record<string, number>
): TitikTren[] {
  const perTanggal = new Map<string, T[]>();
  for (const r of rows) {
    const arr = perTanggal.get(r.tanggal) ?? [];
    arr.push(r);
    perTanggal.set(r.tanggal, arr);
  }
  return Array.from(perTanggal.keys())
    .sort()
    .map((tanggal) => ({ name: tanggalPendek(tanggal), tanggal, ...ambil(perTanggal.get(tanggal)!) }));
}

export const SEMUA_WILAYAH = WILAYAH_POSKO;
