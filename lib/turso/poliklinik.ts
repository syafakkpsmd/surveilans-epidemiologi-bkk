// lib/turso/poliklinik.ts
//
// Query + agregasi untuk modul Kunjungan Poliklinik. Sama seperti modul TB,
// semua agregasi (tren, breakdown) dihitung di JS karena Turso/SQLite tidak
// punya fungsi mmwr_week seperti Postgres. Modul ini TIDAK dipakaikan AI
// Analysis/Prediksi (sesuai permintaan), jadi tidak ada dependensi ke
// lib/ai/data.ts atau DataAnalisis di sini.

import { createClient, type Client } from '@libsql/client';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';

let _client: Client | null = null;
function getTursoClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return _client;
}

export const DAFTAR_WILKER_POLIKLINIK = [
  'Samarinda',
  'APT Pranoto',
  'Tanjung Laut',
  'Lhoktuan',
  'Sangatta',
] as const;

export interface KunjunganRow {
  wilayah_kerja: string;
  no_baris: number;
  tanggal_pemeriksaan: string | null;
  nama: string | null;
  jenis_kelamin: string | null;
  usia: number | null;
  diagnosa: string | null;
  keterangan: string | null;
}

// ------------------------------------------------------------
// Raw data
// ------------------------------------------------------------
export async function getKunjunganRawData(tahun?: number, wilayahKerja?: string): Promise<KunjunganRow[]> {
  const client = getTursoClient();
  const kondisi: string[] = [];
  const args: (string | number)[] = [];

  if (tahun) {
    kondisi.push(`strftime('%Y', tanggal_pemeriksaan) = ?`);
    args.push(String(tahun));
  }
  if (wilayahKerja) {
    kondisi.push(`wilayah_kerja = ?`);
    args.push(wilayahKerja);
  }

  const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
  const result = await client.execute({
    sql: `SELECT wilayah_kerja, no_baris, tanggal_pemeriksaan, nama, jenis_kelamin, usia, diagnosa, keterangan
          FROM kunjungan_poliklinik ${whereSql}
          ORDER BY tanggal_pemeriksaan ASC`,
    args,
  });
  return result.rows as unknown as KunjunganRow[];
}

// ------------------------------------------------------------
// 1) Ringkasan KPI
// ------------------------------------------------------------
export interface RingkasanKunjungan {
  totalKunjungan: number;
  jumlahDiagnosaUnik: number;
  wilkerTerbanyak: string | null;
  rataRataPerHari: number;
}

export function hitungRingkasanKunjungan(rows: KunjunganRow[]): RingkasanKunjungan {
  const totalKunjungan = rows.length;
  const diagnosaSet = new Set(rows.map((r) => (r.diagnosa ?? '').trim()).filter(Boolean));

  const perWilker = new Map<string, number>();
  for (const r of rows) {
    perWilker.set(r.wilayah_kerja, (perWilker.get(r.wilayah_kerja) ?? 0) + 1);
  }
  let wilkerTerbanyak: string | null = null;
  let maxWilker = -1;
  for (const [w, jumlah] of perWilker) {
    if (jumlah > maxWilker) {
      maxWilker = jumlah;
      wilkerTerbanyak = w;
    }
  }

  const tanggalUnik = new Set(rows.map((r) => r.tanggal_pemeriksaan).filter(Boolean));
  const rataRataPerHari = tanggalUnik.size > 0 ? totalKunjungan / tanggalUnik.size : 0;

  return {
    totalKunjungan,
    jumlahDiagnosaUnik: diagnosaSet.size,
    wilkerTerbanyak,
    rataRataPerHari: Math.round(rataRataPerHari * 10) / 10,
  };
}

// ------------------------------------------------------------
// 2) Tren Mingguan / Bulanan
// ------------------------------------------------------------
export interface TitikTrenKunjungan {
  periode: string;
  totalKunjungan: number;
}

export function hitungTrenMingguanKunjungan(rows: KunjunganRow[]): TitikTrenKunjungan[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.tanggal_pemeriksaan) continue;
    const tgl = new Date(r.tanggal_pemeriksaan);
    if (isNaN(tgl.getTime())) continue;
    const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(tgl);
    const key = `${tahunEpid}-W${String(mingguEpid).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([periode, totalKunjungan]) => ({ periode, totalKunjungan }))
    .sort((a, b) => a.periode.localeCompare(b.periode));
}

export function hitungTrenBulananKunjungan(rows: KunjunganRow[]): TitikTrenKunjungan[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.tanggal_pemeriksaan) continue;
    const tgl = new Date(r.tanggal_pemeriksaan);
    if (isNaN(tgl.getTime())) continue;
    const key = `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([periode, totalKunjungan]) => ({ periode, totalKunjungan }))
    .sort((a, b) => a.periode.localeCompare(b.periode));
}

// ------------------------------------------------------------
// 3) Top Diagnosa
// ------------------------------------------------------------
export interface TopDiagnosa {
  diagnosa: string;
  jumlah: number;
}

export function hitungTopDiagnosa(rows: KunjunganRow[], limit = 10): TopDiagnosa[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = (r.diagnosa ?? '').trim();
    if (!d) continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([diagnosa, jumlah]) => ({ diagnosa, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, limit);
}

// ------------------------------------------------------------
// 4) Donut Jenis Kelamin
// ------------------------------------------------------------
export function hitungDonutJenisKelaminKunjungan(rows: KunjunganRow[]): { label: string; jumlah: number }[] {
  const lakiLaki = rows.filter((r) => (r.jenis_kelamin ?? '').trim().toLowerCase().startsWith('l')).length;
  const perempuan = rows.filter((r) => (r.jenis_kelamin ?? '').trim().toLowerCase().startsWith('p')).length;
  return [
    { label: 'Laki-laki', jumlah: lakiLaki },
    { label: 'Perempuan', jumlah: perempuan },
  ];
}

// ------------------------------------------------------------
// 5) Donut Kelompok Usia
// ------------------------------------------------------------
export function hitungDonutKelompokUsia(rows: KunjunganRow[]): { label: string; jumlah: number }[] {
  const kelompok = { balita: 0, anak: 0, dewasa: 0, lansia: 0, tidakDiketahui: 0 };
  for (const r of rows) {
    const usia = r.usia;
    if (usia === null || usia === undefined) {
      kelompok.tidakDiketahui++;
    } else if (usia <= 5) {
      kelompok.balita++;
    } else if (usia <= 17) {
      kelompok.anak++;
    } else if (usia <= 59) {
      kelompok.dewasa++;
    } else {
      kelompok.lansia++;
    }
  }
  return [
    { label: 'Balita (0-5 th)', jumlah: kelompok.balita },
    { label: 'Anak (6-17 th)', jumlah: kelompok.anak },
    { label: 'Dewasa (18-59 th)', jumlah: kelompok.dewasa },
    { label: 'Lansia (60+ th)', jumlah: kelompok.lansia },
    { label: 'Tidak diketahui', jumlah: kelompok.tidakDiketahui },
  ].filter((k) => k.jumlah > 0);
}

// ------------------------------------------------------------
// 6) Breakdown per Wilker
// ------------------------------------------------------------
export function hitungBreakdownWilker(rows: KunjunganRow[]): { wilayahKerja: string; jumlah: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.wilayah_kerja, (map.get(r.wilayah_kerja) ?? 0) + 1);
  }
  return DAFTAR_WILKER_POLIKLINIK.map((w) => ({ wilayahKerja: w, jumlah: map.get(w) ?? 0 }));
}

// ------------------------------------------------------------
// 7) Pola Hari Kunjungan (Senin-Minggu) -- berguna untuk perencanaan piket
// ------------------------------------------------------------
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu'];

export function hitungPolaHariKunjungan(rows: KunjunganRow[]): { hari: string; jumlah: number }[] {
  const jumlahPerHari = [0, 0, 0, 0, 0, 0, 0]; // index 0=Minggu .. 6=Sabtu
  for (const r of rows) {
    if (!r.tanggal_pemeriksaan) continue;
    const tgl = new Date(r.tanggal_pemeriksaan);
    if (isNaN(tgl.getTime())) continue;
    jumlahPerHari[tgl.getDay()]++;
  }
  // urutkan mulai Senin supaya enak dibaca di chart
  const urutan = [1, 2, 3, 4, 5, 6, 0];
  return urutan.map((i) => ({ hari: NAMA_HARI[i], jumlah: jumlahPerHari[i] }));
}