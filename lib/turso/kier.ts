// lib/turso/kier.ts
//
// CATATAN INTEGRASI: file ini mengasumsikan sudah ada client Turso bersama
// yang dipakai modul TB/HIV/Klinik/Poliklinik, biasanya di '@/lib/turso/client'
// dengan export seperti:
//   export const tursoClient = createClient({ url: ..., authToken: ... })
// Sesuaikan path import di bawah ini dengan yang sudah ada di project Anda.

import { getTursoClient } from '@/lib/turso/client';

const tursoClient = getTursoClient();

export const DAFTAR_WILKER_KIER = ['Samarinda', 'APT Pranoto', 'Tanjung Laut', 'Lhoktuan', 'Sangatta'];
 
export interface BarisKier {
  wilayah_kerja: string;
  no_baris: number;
  nama: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  alamat: string | null;
  tujuan_pemeriksaan: string | null;
  tanggal_pemeriksaan: string | null; // yyyy-MM-dd
  kesimpulan: string | null;
  tempat_terbit: string | null;
}
 
export interface RingkasanKier {
  totalPemeriksaan: number;
  breakdownKesimpulan: { label: string; jumlah: number }[];
  breakdownJenisKelamin: { label: string; jumlah: number }[];
  tujuanTerbanyak: { label: string; jumlah: number }[];
  breakdownWilker: { label: string; jumlah: number }[];
}
 
export interface TitikMingguan {
  minggu: number;
  label: string; // "Mg 1", "Mg 2", dst
  jumlah: number;
}
 
export interface TitikBulanan {
  bulan: number;
  label: string; // "Januari", "Februari", dst
  jumlah: number;
}
 
/** Titik mingguan/bulanan dengan satu kolom angka per wilayah kerja, dipakai untuk chart breakdown */
export interface TitikMingguanPerWilker {
  minggu: number;
  label: string;
  [wilayahKerja: string]: number | string;
}
 
export interface TitikBulananPerWilker {
  bulan: number;
  label: string;
  [wilayahKerja: string]: number | string;
}
 
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
 
/** Ambil seluruh baris untuk satu tahun, opsional difilter satu wilayah kerja */
async function ambilBarisTahun(tahun: number, wilayahKerja?: string): Promise<BarisKier[]> {
  const kondisiWilker = wilayahKerja ? 'AND wilayah_kerja = ?' : '';
  const args: any[] = [String(tahun)];
  if (wilayahKerja) args.push(wilayahKerja);
 
  const result = await tursoClient.execute({
    sql: `SELECT wilayah_kerja, no_baris, nama, tanggal_lahir, jenis_kelamin, alamat,
                 tujuan_pemeriksaan, tanggal_pemeriksaan, kesimpulan, tempat_terbit
          FROM kier_kesehatan
          WHERE substr(tanggal_pemeriksaan, 1, 4) = ? ${kondisiWilker}
          ORDER BY tanggal_pemeriksaan ASC`,
    args,
  });
 
  return result.rows.map((row: any) => ({
    wilayah_kerja: row.wilayah_kerja,
    no_baris: Number(row.no_baris),
    nama: row.nama,
    tanggal_lahir: row.tanggal_lahir,
    jenis_kelamin: row.jenis_kelamin,
    alamat: row.alamat,
    tujuan_pemeriksaan: row.tujuan_pemeriksaan,
    tanggal_pemeriksaan: row.tanggal_pemeriksaan,
    kesimpulan: row.kesimpulan,
    tempat_terbit: row.tempat_terbit,
  }));
}
 
/**
 * Minggu epidemiologi sederhana (Minggu sebagai awal minggu), dipakai untuk
 * agregasi di JS karena Turso (SQLite) tidak punya fungsi mmwr_week seperti
 * di Supabase Postgres. Pola ini konsisten dengan modul Poliklinik/TB/HIV.
 */
export function hitungMingguEpid(tanggalIso: string): { tahun: number; minggu: number } {
  const tanggal = new Date(tanggalIso + 'T00:00:00');
  const tahun = tanggal.getFullYear();
  const awalTahun = new Date(tahun, 0, 1);
  const hariAwalTahun = awalTahun.getDay(); // 0 = Minggu
  const selisihHari = Math.floor((tanggal.getTime() - awalTahun.getTime()) / 86400000);
  const minggu = Math.floor((selisihHari + hariAwalTahun) / 7) + 1;
  return { tahun, minggu };
}
 
/** Ringkasan untuk kartu-kartu di bagian atas dashboard. wilayahKerja opsional = filter 1 wilker */
export async function getRingkasanKier(tahun: number, wilayahKerja?: string): Promise<RingkasanKier> {
  const data = await ambilBarisTahun(tahun, wilayahKerja);
 
  const hitung = (arr: BarisKier[], key: keyof BarisKier) => {
    const map = new Map<string, number>();
    arr.forEach((b) => {
      const nilai = (b[key] as string) || 'Tidak diketahui';
      map.set(nilai, (map.get(nilai) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, jumlah]) => ({ label, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  };
 
  // Breakdown wilker SELALU dari semua wilker (walau sedang difilter 1 wilker),
  // supaya kartu/chart perbandingan antar-wilker tetap informatif
  const dataSemuaWilker = wilayahKerja ? await ambilBarisTahun(tahun) : data;
 
  return {
    totalPemeriksaan: data.length,
    breakdownKesimpulan: hitung(data, 'kesimpulan'),
    breakdownJenisKelamin: hitung(data, 'jenis_kelamin'),
    tujuanTerbanyak: hitung(data, 'tujuan_pemeriksaan').slice(0, 5),
    breakdownWilker: hitung(dataSemuaWilker, 'wilayah_kerja'),
  };
}
 
/** Tren mingguan, difilter rentang minggu (mingguAwal..mingguAkhir), opsional 1 wilker */
export async function getTrenMingguanKier(
  tahun: number,
  mingguAwal: number,
  mingguAkhir: number,
  wilayahKerja?: string
): Promise<TitikMingguan[]> {
  const data = await ambilBarisTahun(tahun, wilayahKerja);
  const perMinggu = new Map<number, number>();
 
  data.forEach((b) => {
    if (!b.tanggal_pemeriksaan) return;
    const { minggu } = hitungMingguEpid(b.tanggal_pemeriksaan);
    perMinggu.set(minggu, (perMinggu.get(minggu) || 0) + 1);
  });
 
  const hasil: TitikMingguan[] = [];
  for (let m = mingguAwal; m <= mingguAkhir; m++) {
    hasil.push({ minggu: m, label: `Mg ${m}`, jumlah: perMinggu.get(m) || 0 });
  }
  return hasil;
}
 
/** Tren bulanan, difilter rentang bulan (bulanAwal..bulanAkhir, 1-12), opsional 1 wilker */
export async function getTrenBulananKier(
  tahun: number,
  bulanAwal: number,
  bulanAkhir: number,
  wilayahKerja?: string
): Promise<TitikBulanan[]> {
  const data = await ambilBarisTahun(tahun, wilayahKerja);
  const perBulan = new Map<number, number>();
 
  data.forEach((b) => {
    if (!b.tanggal_pemeriksaan) return;
    const bulan = Number(b.tanggal_pemeriksaan.slice(5, 7));
    perBulan.set(bulan, (perBulan.get(bulan) || 0) + 1);
  });
 
  const hasil: TitikBulanan[] = [];
  for (let bl = bulanAwal; bl <= bulanAkhir; bl++) {
    hasil.push({ bulan: bl, label: NAMA_BULAN[bl - 1], jumlah: perBulan.get(bl) || 0 });
  }
  return hasil;
}
 
/** Daftar tahun yang tersedia di data, untuk dropdown filter tahun */
export async function getDaftarTahunKier(): Promise<number[]> {
  const result = await tursoClient.execute({
    sql: `SELECT DISTINCT substr(tanggal_pemeriksaan, 1, 4) AS tahun
          FROM kier_kesehatan
          WHERE tanggal_pemeriksaan IS NOT NULL AND tanggal_pemeriksaan != ''
          ORDER BY tahun DESC`,
  });
  return result.rows.map((r: any) => Number(r.tahun)).filter((t) => !isNaN(t));
}
 
/**
 * Daftar wilayah kerja YANG BENAR-BENAR ADA di data Turso untuk tahun ini,
 * digabung dengan DAFTAR_WILKER_KIER (supaya urutan/warna tetap konsisten
 * untuk 5 wilker resmi walau datanya baru 0). Wilker "asing" (typo/beda
 * ejaan dari sheet) tetap ikut ditampilkan di akhir daftar, bukan hilang
 * diam-diam — supaya kelihatan kalau ada nama wilker yang tidak konsisten.
 */
export async function getDaftarWilkerAktif(tahun: number): Promise<string[]> {
  const result = await tursoClient.execute({
    sql: `SELECT DISTINCT wilayah_kerja
          FROM kier_kesehatan
          WHERE substr(tanggal_pemeriksaan, 1, 4) = ?
            AND wilayah_kerja IS NOT NULL AND wilayah_kerja != ''`,
    args: [String(tahun)],
  });
 
  const dariData = result.rows.map((r: any) => String(r.wilayah_kerja));
  const gabungan = [...DAFTAR_WILKER_KIER];
  dariData.forEach((w) => {
    if (!gabungan.includes(w)) gabungan.push(w);
  });
  return gabungan;
}
 
/**
 * Tren mingguan DIPECAH per wilayah kerja (selalu dari SEMUA wilker, tidak
 * ikut filter wilayahKerja) — dipakai untuk chart breakdown "Seluruh Wilayah
 * Kerja". Front-end yang menentukan kapan chart ini ditampilkan (hanya saat
 * tidak ada 1 wilker spesifik yang difilter).
 *
 * `daftarWilker` SEBAIKNYA diisi hasil getDaftarWilkerAktif(tahun) supaya
 * kolom yang dibentuk cocok persis dengan nilai wilayah_kerja yang benar-
 * benar ada di Turso (bukan hardcode) — kalau tidak diisi, fallback ke
 * DAFTAR_WILKER_KIER (bisa membuat data 0 semua kalau ejaan di sheet beda).
 */
export async function getTrenMingguanPerWilkerKier(
  tahun: number,
  mingguAwal: number,
  mingguAkhir: number,
  daftarWilker: string[] = DAFTAR_WILKER_KIER
): Promise<TitikMingguanPerWilker[]> {
  const data = await ambilBarisTahun(tahun);
  const perMinggu = new Map<number, Record<string, number>>();
 
  data.forEach((b) => {
    if (!b.tanggal_pemeriksaan) return;
    const { minggu } = hitungMingguEpid(b.tanggal_pemeriksaan);
    if (!perMinggu.has(minggu)) perMinggu.set(minggu, {});
    const rec = perMinggu.get(minggu)!;
    const wilker = b.wilayah_kerja || 'Tidak diketahui';
    rec[wilker] = (rec[wilker] || 0) + 1;
  });
 
  const hasil: TitikMingguanPerWilker[] = [];
  for (let m = mingguAwal; m <= mingguAkhir; m++) {
    const rec = perMinggu.get(m) || {};
    const titik: TitikMingguanPerWilker = { minggu: m, label: `Mg ${m}` };
    daftarWilker.forEach((w) => {
      titik[w] = rec[w] || 0;
    });
    hasil.push(titik);
  }
  return hasil;
}
 
/**
 * Tren bulanan DIPECAH per wilayah kerja (selalu dari SEMUA wilker) —
 * dipakai untuk chart breakdown batang "Seluruh Wilayah Kerja".
 * `daftarWilker` sebaiknya diisi hasil getDaftarWilkerAktif(tahun), sama
 * seperti getTrenMingguanPerWilkerKier di atas.
 */
export async function getTrenBulananPerWilkerKier(
  tahun: number,
  bulanAwal: number,
  bulanAkhir: number,
  daftarWilker: string[] = DAFTAR_WILKER_KIER
): Promise<TitikBulananPerWilker[]> {
  const data = await ambilBarisTahun(tahun);
  const perBulan = new Map<number, Record<string, number>>();
 
  data.forEach((b) => {
    if (!b.tanggal_pemeriksaan) return;
    const bulan = Number(b.tanggal_pemeriksaan.slice(5, 7));
    if (!perBulan.has(bulan)) perBulan.set(bulan, {});
    const rec = perBulan.get(bulan)!;
    const wilker = b.wilayah_kerja || 'Tidak diketahui';
    rec[wilker] = (rec[wilker] || 0) + 1;
  });
 
  const hasil: TitikBulananPerWilker[] = [];
  for (let bl = bulanAwal; bl <= bulanAkhir; bl++) {
    const rec = perBulan.get(bl) || {};
    const titik: TitikBulananPerWilker = { bulan: bl, label: NAMA_BULAN[bl - 1] };
    daftarWilker.forEach((w) => {
      titik[w] = rec[w] || 0;
    });
    hasil.push(titik);
  }
  return hasil;
}
 