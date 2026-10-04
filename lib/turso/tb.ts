// lib/turso/tb.ts
//
// Query layer modul TB. Turso (SQLite) tidak punya fungsi mmwr_week seperti
// Postgres/Supabase, jadi pola di sini: ambil raw rows dari tb_data (query
// sederhana, difilter rentang tanggal di SQL), lalu SEMUA agregasi
// (mingguan/bulanan/cascade/breakdown faktor risiko) dihitung di JavaScript
// memakai hitungMingguEpidemiologi() yang sudah ada di @/lib/epi-week.
//
// Kalau project sudah punya lib/turso/client.ts (dipakai data_icv/stok_vaksin),
// HAPUS getTursoClient() di bawah ini dan import dari sana supaya konsisten
// (satu koneksi/singleton), tinggal ganti baris import di paling atas.

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

export const DAFTAR_WILKER_TB = [
  'Samarinda',
  'APT Pranoto',
  'Tanjung Santan',
  'Tanjung Laut',
  'Lhoktuan',
  'Sangatta',
  'Sangkulirang',
] as const;

// ------------------------------------------------------------
// Tipe data
// ------------------------------------------------------------
export interface TbRow {
  wilayah_kerja: string;
  no_baris: number;
  tanggal_pelaksanaan: string | null;
  nama_peserta: string | null;
  provinsi: string | null;
  kabupaten_kota: string | null;
  nik: string | null;
  pekerjaan: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  riwayat_kontak_tbc: string | null;
  jenis_kontak_tbc: string | null;
  pernah_terdiagnosa_tbc: string | null;
  kekurangan_gizi: string | null;
  merokok: string | null;
  perokok_pasif: string | null;
  riwayat_dm: string | null;
  odhiv: string | null;
  lansia: string | null;
  ibu_hamil: string | null;
  hasil_skrining_gejala: string | null;
  terduga_tbc: string | null;
  tindak_lanjut_pemeriksaan: string | null;
  fasyankes_pemeriksaan: string | null;
  nomor_register_sitb: string | null;
  tanggal_hasil_diagnosis: string | null;
  hasil_pemeriksaan_diagnosis: string | null;
  jenis_pemeriksaan_diagnosis: string | null;
  terkonfirmasi_tbc: string | null;
}

const YA = (v: string | null | undefined) => (v ?? '').trim().toLowerCase() === 'ya';

// ------------------------------------------------------------
// Ambil raw data (dasar semua agregasi di bawah)
// ------------------------------------------------------------
export async function getTbRawData(tahun?: number, wilayahKerja?: string): Promise<TbRow[]> {
  const client = getTursoClient();
  const kondisi: string[] = [];
  const args: string[] = [];

  if (tahun) {
    kondisi.push(`strftime('%Y', tanggal_pelaksanaan) = ?`);
    args.push(String(tahun));
  }
  if (wilayahKerja) {
    kondisi.push(`wilayah_kerja = ?`);
    args.push(wilayahKerja);
  }

  const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
  const result = await client.execute({
    sql: `SELECT * FROM tb_data ${whereSql} ORDER BY tanggal_pelaksanaan ASC`,
    args,
  });
  return result.rows as unknown as TbRow[];
}

// ------------------------------------------------------------
// 1) Ringkasan Cascade Skrining TB
//    Skrining -> Bergejala/Terduga -> Diperiksa -> Terkonfirmasi
// ------------------------------------------------------------
export interface RingkasanCascadeTb {
  totalSkrining: number;
  totalTerduga: number;
  totalDiperiksa: number;
  totalTerkonfirmasi: number;
  caseDetectionRate: number; // terkonfirmasi / skrining (%)
  yieldRateTerduga: number; // terkonfirmasi / terduga (%)
}

export function hitungCascadeTb(rows: TbRow[]): RingkasanCascadeTb {
  const totalSkrining = rows.length;
  const totalTerduga = rows.filter((r) => YA(r.terduga_tbc)).length;
  const totalDiperiksa = rows.filter(
    (r) => r.hasil_pemeriksaan_diagnosis && r.hasil_pemeriksaan_diagnosis.trim() !== ''
  ).length;
  const totalTerkonfirmasi = rows.filter((r) => YA(r.terkonfirmasi_tbc)).length;

  return {
    totalSkrining,
    totalTerduga,
    totalDiperiksa,
    totalTerkonfirmasi,
    caseDetectionRate: totalSkrining > 0 ? (totalTerkonfirmasi / totalSkrining) * 100 : 0,
    yieldRateTerduga: totalTerduga > 0 ? (totalTerkonfirmasi / totalTerduga) * 100 : 0,
  };
}

// ------------------------------------------------------------
// 2) Tren Mingguan / Bulanan (skrining, terduga, terkonfirmasi)
// ------------------------------------------------------------
export interface TitikTrenTb {
  periode: string; // "2026-W12" atau "2026-05"
  totalSkrining: number;
  totalTerduga: number;
  totalTerkonfirmasi: number;
}

export function hitungTrenMingguanTb(rows: TbRow[]): TitikTrenTb[] {
  const map = new Map<string, TitikTrenTb>();

  for (const r of rows) {
    if (!r.tanggal_pelaksanaan) continue;
    const tgl = new Date(r.tanggal_pelaksanaan);
    if (isNaN(tgl.getTime())) continue;

    const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(tgl);
    const key = `${tahunEpid}-W${String(mingguEpid).padStart(2, '0')}`;

    if (!map.has(key)) {
      map.set(key, { periode: key, totalSkrining: 0, totalTerduga: 0, totalTerkonfirmasi: 0 });
    }
    const titik = map.get(key)!;
    titik.totalSkrining += 1;
    if (YA(r.terduga_tbc)) titik.totalTerduga += 1;
    if (YA(r.terkonfirmasi_tbc)) titik.totalTerkonfirmasi += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.periode.localeCompare(b.periode));
}

export function hitungTrenBulananTb(rows: TbRow[]): TitikTrenTb[] {
  const map = new Map<string, TitikTrenTb>();

  for (const r of rows) {
    if (!r.tanggal_pelaksanaan) continue;
    const tgl = new Date(r.tanggal_pelaksanaan);
    if (isNaN(tgl.getTime())) continue;

    const key = `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, { periode: key, totalSkrining: 0, totalTerduga: 0, totalTerkonfirmasi: 0 });
    }
    const titik = map.get(key)!;
    titik.totalSkrining += 1;
    if (YA(r.terduga_tbc)) titik.totalTerduga += 1;
    if (YA(r.terkonfirmasi_tbc)) titik.totalTerkonfirmasi += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.periode.localeCompare(b.periode));
}

// ------------------------------------------------------------
// 2b) Filter baris berdasarkan rentang minggu/bulan epidemiologi --
//     dipakai di page.tsx SEBELUM menghitung KPI/cascade/breakdown
//     lain, supaya semuanya "ikut" rentang yang dipilih user, bukan
//     cuma chart Tren-nya saja.
// ------------------------------------------------------------
export function filterRowsByRentangMinggu(rows: TbRow[], mulai: string, akhir: string): TbRow[] {
  return rows.filter((r) => {
    if (!r.tanggal_pelaksanaan) return false;
    const tgl = new Date(r.tanggal_pelaksanaan);
    if (isNaN(tgl.getTime())) return false;
    const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(tgl);
    const periode = `${tahunEpid}-W${String(mingguEpid).padStart(2, '0')}`;
    return periode >= mulai && periode <= akhir;
  });
}

export function filterRowsByRentangBulan(rows: TbRow[], mulai: string, akhir: string): TbRow[] {
  return rows.filter((r) => {
    if (!r.tanggal_pelaksanaan) return false;
    const periode = r.tanggal_pelaksanaan.slice(0, 7); // "YYYY-MM"
    return periode >= mulai && periode <= akhir;
  });
}

// ------------------------------------------------------------
// 3) Breakdown Faktor Risiko -- kelompok mana yang paling "produktif"
//    ditemukan terduga/terkonfirmasi (untuk arahkan target skrining ACF)
// ------------------------------------------------------------
export interface BreakdownFaktorRisikoTb {
  faktor: string;
  totalDiskrining: number;
  totalTerduga: number;
  totalTerkonfirmasi: number;
  yieldPersen: number; // terkonfirmasi / diskrining pada kelompok ini (%)
}

const FAKTOR_RISIKO_FIELDS: { label: string; ambil: (r: TbRow) => boolean }[] = [
  { label: 'Kontak Serumah', ambil: (r) => YA(r.riwayat_kontak_tbc) && r.jenis_kontak_tbc?.trim() === 'Kontak Serumah' },
  { label: 'Kontak Erat', ambil: (r) => YA(r.riwayat_kontak_tbc) && r.jenis_kontak_tbc?.trim() === 'Kontak Erat' },
  { label: 'Kekurangan Gizi', ambil: (r) => YA(r.kekurangan_gizi) },
  { label: 'Merokok', ambil: (r) => YA(r.merokok) },
  { label: 'Perokok Pasif', ambil: (r) => YA(r.perokok_pasif) },
  { label: 'Riwayat DM', ambil: (r) => YA(r.riwayat_dm) },
  { label: 'ODHIV', ambil: (r) => YA(r.odhiv) },
  { label: 'Lansia >65 th', ambil: (r) => YA(r.lansia) },
  { label: 'Ibu Hamil', ambil: (r) => YA(r.ibu_hamil) },
];

export function hitungBreakdownFaktorRisikoTb(rows: TbRow[]): BreakdownFaktorRisikoTb[] {
  return FAKTOR_RISIKO_FIELDS.map(({ label, ambil }) => {
    const kelompok = rows.filter(ambil);
    const totalDiskrining = kelompok.length;
    const totalTerduga = kelompok.filter((r) => YA(r.terduga_tbc)).length;
    const totalTerkonfirmasi = kelompok.filter((r) => YA(r.terkonfirmasi_tbc)).length;
    return {
      faktor: label,
      totalDiskrining,
      totalTerduga,
      totalTerkonfirmasi,
      yieldPersen: totalDiskrining > 0 ? (totalTerkonfirmasi / totalDiskrining) * 100 : 0,
    };
  }).sort((a, b) => b.yieldPersen - a.yieldPersen);
}

// ------------------------------------------------------------
// 3b) Breakdown per Wilayah Kerja BKK (bukan kab/kota asal peserta) --
//     untuk kebutuhan operasional/pencetakan laporan per wilker
// ------------------------------------------------------------
export interface BreakdownWilkerTb {
  wilayahKerja: string;
  totalSkrining: number;
  totalTerduga: number;
  totalTerkonfirmasi: number;
}

export function hitungBreakdownWilkerTb(rows: TbRow[]): BreakdownWilkerTb[] {
  const map = new Map<string, BreakdownWilkerTb>();
  for (const r of rows) {
    const key = r.wilayah_kerja;
    if (!map.has(key)) {
      map.set(key, { wilayahKerja: key, totalSkrining: 0, totalTerduga: 0, totalTerkonfirmasi: 0 });
    }
    const d = map.get(key)!;
    d.totalSkrining += 1;
    if (YA(r.terduga_tbc)) d.totalTerduga += 1;
    if (YA(r.terkonfirmasi_tbc)) d.totalTerkonfirmasi += 1;
  }
  // Urut sesuai DAFTAR_WILKER_TB supaya tampilan chart konsisten, wilker
  // yang belum ada datanya sama sekali tetap tampil dengan nilai 0.
  return DAFTAR_WILKER_TB.map(
    (w) => map.get(w) ?? { wilayahKerja: w, totalSkrining: 0, totalTerduga: 0, totalTerkonfirmasi: 0 }
  );
}

// ------------------------------------------------------------
// 4) Delay diagnosis: selisih hari tanggal skrining -> tanggal hasil
//    (indikator kecepatan program, target ideal TCM <= H+2)
// ------------------------------------------------------------
export interface RingkasanDelayTb {
  jumlahKasusDihitung: number;
  rataRataHari: number;
  medianHari: number;
  maksimalHari: number;
}

export function hitungDelayDiagnosisTb(rows: TbRow[]): RingkasanDelayTb {
  const delays: number[] = [];
  for (const r of rows) {
    if (!r.tanggal_pelaksanaan || !r.tanggal_hasil_diagnosis) continue;
    const a = new Date(r.tanggal_pelaksanaan).getTime();
    const b = new Date(r.tanggal_hasil_diagnosis).getTime();
    if (isNaN(a) || isNaN(b) || b < a) continue;
    delays.push(Math.round((b - a) / (1000 * 60 * 60 * 24)));
  }

  if (delays.length === 0) {
    return { jumlahKasusDihitung: 0, rataRataHari: 0, medianHari: 0, maksimalHari: 0 };
  }

  delays.sort((a, b) => a - b);
  const rataRata = delays.reduce((a, b) => a + b, 0) / delays.length;
  const median = delays[Math.floor(delays.length / 2)];

  return {
    jumlahKasusDihitung: delays.length,
    rataRataHari: Math.round(rataRata * 10) / 10,
    medianHari: median,
    maksimalHari: delays[delays.length - 1],
  };
}

// ------------------------------------------------------------
// 5) Distribusi Kabupaten/Kota
// ------------------------------------------------------------
export interface DistribusiWilayahTb {
  kabupatenKota: string;
  totalSkrining: number;
  totalTerkonfirmasi: number;
}

// FIX: data ini nasional (Provinsi/Kabupaten-Kota bisa dari seluruh
// Indonesia, bukan cuma Kaltim), jadi bisa ratusan kategori kalau
// ditampilkan semua -- chart jadi tidak terbaca. Dibatasi Top N,
// sisanya digabung jadi satu batang "Lainnya".
export function hitungDistribusiKabKotaTb(rows: TbRow[], limit = 15): DistribusiWilayahTb[] {
  const map = new Map<string, DistribusiWilayahTb>();
  for (const r of rows) {
    const key = (r.kabupaten_kota ?? 'Tidak diketahui').trim() || 'Tidak diketahui';
    if (!map.has(key)) {
      map.set(key, { kabupatenKota: key, totalSkrining: 0, totalTerkonfirmasi: 0 });
    }
    const d = map.get(key)!;
    d.totalSkrining += 1;
    if (YA(r.terkonfirmasi_tbc)) d.totalTerkonfirmasi += 1;
  }

  const semua = Array.from(map.values()).sort((a, b) => b.totalSkrining - a.totalSkrining);
  if (semua.length <= limit) return semua;

  const teratas = semua.slice(0, limit);
  const sisa = semua.slice(limit);
  const gabunganLainnya = sisa.reduce(
    (acc, d) => ({
      kabupatenKota: `Lainnya (${sisa.length} kab/kota)`,
      totalSkrining: acc.totalSkrining + d.totalSkrining,
      totalTerkonfirmasi: acc.totalTerkonfirmasi + d.totalTerkonfirmasi,
    }),
    { kabupatenKota: '', totalSkrining: 0, totalTerkonfirmasi: 0 }
  );

  return [...teratas, gabunganLainnya];
}

// ------------------------------------------------------------
// 6) Donut Jenis Kelamin
// ------------------------------------------------------------
export function hitungDonutJenisKelaminTb(rows: TbRow[]): { label: string; jumlah: number }[] {
  const lakiLaki = rows.filter((r) => r.jenis_kelamin?.trim() === 'Laki-laki').length;
  const perempuan = rows.filter((r) => r.jenis_kelamin?.trim() === 'Perempuan').length;
  return [
    { label: 'Laki-laki', jumlah: lakiLaki },
    { label: 'Perempuan', jumlah: perempuan },
  ];
}

// ------------------------------------------------------------
// 7) Daftar terduga TBC yang BELUM ada tindak lanjut / hasil
//    (actionable list untuk petugas follow-up, bukan cuma statistik)
// ------------------------------------------------------------
export interface TerdugaBelumTindakLanjutTb {
  wilayahKerja: string;
  noBaris: number;
  namaPeserta: string | null;
  nik: string | null;
  tanggalPelaksanaan: string | null;
  kabupatenKota: string | null;
  tindakLanjutPemeriksaan: string | null;
  fasyankesPemeriksaan: string | null;
}

export function ambilDaftarBelumTindakLanjutTb(rows: TbRow[]): TerdugaBelumTindakLanjutTb[] {
  return rows
    .filter((r) => YA(r.terduga_tbc))
    .filter((r) => {
      const belumHasil = !r.hasil_pemeriksaan_diagnosis || r.hasil_pemeriksaan_diagnosis.trim() === '';
      return belumHasil;
    })
    .map((r) => ({
      wilayahKerja: r.wilayah_kerja,
      noBaris: r.no_baris,
      namaPeserta: r.nama_peserta,
      nik: r.nik,
      tanggalPelaksanaan: r.tanggal_pelaksanaan,
      kabupatenKota: r.kabupaten_kota,
      tindakLanjutPemeriksaan: r.tindak_lanjut_pemeriksaan,
      fasyankesPemeriksaan: r.fasyankes_pemeriksaan,
    }))
    .sort((a, b) => (a.tanggalPelaksanaan ?? '').localeCompare(b.tanggalPelaksanaan ?? ''));
}
export interface ItemDonutTb {
  label: string;
  jumlah: number;
}

export interface DemografiTb {
  usia: ItemDonutTb[];
  pekerjaan: ItemDonutTb[];
  perokok: ItemDonutTb[];
  dm: ItemDonutTb[];
  kekuranganGizi: ItemDonutTb[];
}

function hitungKategoriTb(
  nilai: (string | null | undefined)[],
  normalisasi: (v: string) => string = (v) => v
): ItemDonutTb[] {
  const peta = new Map<string, number>();
  for (const v of nilai) {
    const bersih = (v ?? '').trim();
    const label = bersih ? normalisasi(bersih) : 'Tidak diketahui';
    peta.set(label, (peta.get(label) ?? 0) + 1);
  }
  return [...peta.entries()]
    .map(([label, jumlah]) => ({ label, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

const normYaTidak = (v: string) => {
  const x = v.toLowerCase();
  if (['ya', 'y', 'iya', '1', 'true'].includes(x)) return 'Ya';
  if (['tidak', 't', 'tdk', '0', 'false'].includes(x)) return 'Tidak';
  return 'Tidak diketahui';
};

function hitungUsiaTb(tgl: string | null | undefined): number | null {
  if (!tgl) return null;
  const s = tgl.trim().slice(0, 10);
  let y: number, m: number, d: number;
  let mt = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else return null;
  const now = new Date();
  let umur = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) umur--;
  return umur >= 0 && umur < 120 ? umur : null;
}

const KELOMPOK_USIA_TB = ['< 15', '15–24', '25–34', '35–44', '45–54', '55–64', '≥ 65'];
function kelompokUsiaTb(u: number): string {
  const batas = [15, 25, 35, 45, 55, 65];
  const i = batas.findIndex((b) => u < b);
  return KELOMPOK_USIA_TB[i === -1 ? 6 : i];
}

export function hitungDemografiTb(rows: TbRow[]): DemografiTb {
  // Usia
  const petaUsia = new Map<string, number>(KELOMPOK_USIA_TB.map((k) => [k, 0]));
  let tanpaUsia = 0;
  for (const r of rows) {
    const u = hitungUsiaTb(r.tanggal_lahir);
    if (u === null) tanpaUsia++;
    else petaUsia.set(kelompokUsiaTb(u), (petaUsia.get(kelompokUsiaTb(u)) ?? 0) + 1);
  }
  const usia: ItemDonutTb[] = [...petaUsia.entries()]
    .filter(([, n]) => n > 0)
    .map(([label, jumlah]) => ({ label, jumlah }));
  if (tanpaUsia > 0) usia.push({ label: 'Tidak diketahui', jumlah: tanpaUsia });

  // Pekerjaan: top 5 + Lainnya
  const semuaPekerjaan = hitungKategoriTb(
    rows.map((r) => r.pekerjaan),
    (v) => v.replace(/\s+/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
  );
  const top = semuaPekerjaan.slice(0, 5);
  const sisa = semuaPekerjaan.slice(5).reduce((a, b) => a + b.jumlah, 0);
  const pekerjaan = sisa > 0 ? [...top, { label: 'Lainnya', jumlah: sisa }] : top;

  return {
    usia,
    pekerjaan,
    perokok: hitungKategoriTb(rows.map((r) => r.merokok), normYaTidak),
    dm: hitungKategoriTb(rows.map((r) => r.riwayat_dm), normYaTidak),
    kekuranganGizi: hitungKategoriTb(rows.map((r) => r.kekurangan_gizi), normYaTidak),
  };
}