import { getTursoClient } from '@/lib/turso/client';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';

export interface HivRow {
  wilayah_kerja: string;
  tanggal_kegiatan: string | null;
  sex: string | null;
  tanggal_lahir: string | null;
  status_perkawinan: string | null;
  kunjungan: string | null;
  hasil: string | null;
  jenis_reagen: string | null;
  hubungan_berisiko: string | null;
}

export async function ambilHivRaw(tahun: number): Promise<HivRow[]> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: `SELECT wilayah_kerja, tanggal_kegiatan, sex, tanggal_lahir, status_perkawinan,
                 kunjungan, hasil, jenis_reagen, hubungan_berisiko
          FROM hiv_data
          WHERE strftime('%Y', tanggal_kegiatan) = ? AND tanggal_kegiatan IS NOT NULL`,
    args: [String(tahun)]
  });
  return result.rows as unknown as HivRow[];
}

export async function getDaftarWilayahKerjaHiv(): Promise<string[]> {
  const client = getTursoClient();
  const result = await client.execute(`SELECT DISTINCT wilayah_kerja FROM hiv_data ORDER BY wilayah_kerja`);
  return result.rows.map((r: any) => r.wilayah_kerja as string);
}

// ===== RINGKASAN (kartu) =====
export interface RingkasanHiv {
  totalPemeriksaan: number;
  jumlahReaktif: number;
  jumlahNonReaktif: number;
  persenReaktif: number;
  kunjunganBaru: number;
  hubunganBerisikoYa: number;
}

export function hitungRingkasanHiv(rows: HivRow[]): RingkasanHiv {
  const total = rows.length;
  const reaktif = rows.filter(r => r.hasil === 'Reaktif').length;
  const kunjunganBaru = rows.filter(r => r.kunjungan === 'Baru').length;
  const hubunganBerisikoYa = rows.filter(r => r.hubungan_berisiko === 'Ya').length;
  return {
    totalPemeriksaan: total,
    jumlahReaktif: reaktif,
    jumlahNonReaktif: total - reaktif,
    persenReaktif: total > 0 ? Math.round((reaktif / total) * 1000) / 10 : 0,
    kunjunganBaru,
    hubunganBerisikoYa
  };
}

// ===== DISTRIBUSI GENERIK (donut) =====
export function hitungDistribusi(rows: HivRow[], field: keyof HivRow): { label: string; jumlah: number }[] {
  const peta = new Map<string, number>();
  rows.forEach(r => {
    const nilai = r[field];
    const key = (nilai && String(nilai).trim()) || 'Tidak diketahui';
    peta.set(key, (peta.get(key) || 0) + 1);
  });
  return Array.from(peta.entries()).map(([label, jumlah]) => ({ label, jumlah }));
}

// ===== DISTRIBUSI USIA =====
function hitungUsia(tanggalLahir: string | null, tanggalKegiatan: string | null): number | null {
  if (!tanggalLahir || !tanggalKegiatan) return null;
  const lahir = new Date(tanggalLahir);
  const kegiatan = new Date(tanggalKegiatan);
  if (isNaN(lahir.getTime()) || isNaN(kegiatan.getTime())) return null;
  let usia = kegiatan.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    kegiatan.getMonth() < lahir.getMonth() ||
    (kegiatan.getMonth() === lahir.getMonth() && kegiatan.getDate() < lahir.getDate());
  if (belumUlangTahun) usia--;
  return usia;
}

function bucketUsia(usia: number | null): string {
  if (usia === null || isNaN(usia) || usia < 0) return 'Tidak diketahui';
  if (usia < 20) return '<20';
  if (usia < 30) return '20-29';
  if (usia < 40) return '30-39';
  if (usia < 50) return '40-49';
  return '50+';
}

export function hitungDistribusiUsia(rows: HivRow[]) {
  const peta = new Map<string, number>();
  rows.forEach(r => {
    const key = bucketUsia(hitungUsia(r.tanggal_lahir, r.tanggal_kegiatan));
    peta.set(key, (peta.get(key) || 0) + 1);
  });
  const urutan = ['<20', '20-29', '30-39', '40-49', '50+', 'Tidak diketahui'];
  return urutan.filter(k => peta.has(k)).map(label => ({ label, jumlah: peta.get(label)! }));
}

// ===== FORMAT PERIODE =====
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatPeriodeBulanan(periode: string): string {
  const [tahun, bulan] = periode.split('-');
  const idx = Number(bulan) - 1;
  return NAMA_BULAN[idx] ? `${NAMA_BULAN[idx]} ${tahun}` : periode;
}

// ===== DAFTAR PERIODE PENUH 1 TAHUN (supaya rentang bisa dipilih dari awal tahun) =====
function buatDaftarPeriodeMingguan(tahun: number): string[] {
  // Digenerate penuh 53 minggu (aman untuk tahun dengan 53 minggu epid);
  // minggu yang tidak ada datanya otomatis terisi 0, bukan hilang dari dropdown
  return Array.from({ length: 53 }, (_, i) => `${tahun}-W${i + 1}`);
}

function buatDaftarPeriodeBulanan(tahun: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${tahun}-${String(i + 1).padStart(2, '0')}`);
}

const ambilPeriodeMingguan = (r: HivRow) => {
  if (!r.tanggal_kegiatan) return null;
  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date(r.tanggal_kegiatan));
  return `${tahunEpid}-W${mingguEpid}`;
};
const ambilPeriodeBulanan = (r: HivRow) => (r.tanggal_kegiatan ? r.tanggal_kegiatan.slice(0, 7) : null);

// ===== TREN KESELURUHAN (garis atas) — sekarang full-range 1 tahun, diisi 0 kalau kosong =====
export function hitungTrenMingguan(rows: HivRow[], tahun: number) {
  const daftarPeriode = buatDaftarPeriodeMingguan(tahun);
  const peta = new Map<string, number>();
  rows.forEach(r => {
    const periode = ambilPeriodeMingguan(r);
    if (periode) peta.set(periode, (peta.get(periode) || 0) + 1);
  });
  return daftarPeriode.map(periode => ({ periode, jumlah: peta.get(periode) || 0 }));
}

export function hitungTrenBulanan(rows: HivRow[], tahun: number) {
  const daftarPeriode = buatDaftarPeriodeBulanan(tahun);
  const peta = new Map<string, number>();
  rows.forEach(r => {
    const periode = ambilPeriodeBulanan(r);
    if (periode) peta.set(periode, (peta.get(periode) || 0) + 1);
  });
  return daftarPeriode.map(periode => ({ periode, jumlah: peta.get(periode) || 0 }));
}

// ===== TREN DIPERIKSA VS REAKTIF (chart baru) =====
export interface TitikDiperiksaReaktif { periode: string; Diperiksa: number; Reaktif: number }

function hitungDiperiksaReaktif(rows: HivRow[], daftarPeriode: string[], ambilPeriode: (r: HivRow) => string | null): TitikDiperiksaReaktif[] {
  const totalPeta = new Map<string, number>();
  const reaktifPeta = new Map<string, number>();
  rows.forEach(r => {
    const periode = ambilPeriode(r);
    if (!periode) return;
    totalPeta.set(periode, (totalPeta.get(periode) || 0) + 1);
    if (r.hasil === 'Reaktif') reaktifPeta.set(periode, (reaktifPeta.get(periode) || 0) + 1);
  });
  return daftarPeriode.map(periode => ({
    periode,
    Diperiksa: totalPeta.get(periode) || 0,
    Reaktif: reaktifPeta.get(periode) || 0
  }));
}

export const hitungDiperiksaReaktifMingguan = (rows: HivRow[], tahun: number) =>
  hitungDiperiksaReaktif(rows, buatDaftarPeriodeMingguan(tahun), ambilPeriodeMingguan);

export const hitungDiperiksaReaktifBulanan = (rows: HivRow[], tahun: number) =>
  hitungDiperiksaReaktif(rows, buatDaftarPeriodeBulanan(tahun), ambilPeriodeBulanan);

// ===== TREN PER WILAYAH KERJA x KATEGORI — sekarang full-range juga =====
export const KATEGORI_HASIL = ['Reaktif', 'Non Reaktif'] as const;
export const KATEGORI_HUBUNGAN_BERISIKO = ['Ya', 'Tidak'] as const;

function pivotTrenPerWilayahKategori(
  rows: HivRow[],
  daftarPeriode: string[],
  ambilPeriode: (r: HivRow) => string | null,
  ambilKategori: (r: HivRow) => string | null,
  daftarWilayah: string[],
  kategoriList: readonly string[]
): Record<string, number | string>[] {
  const peta = new Map<string, Record<string, number>>();
  daftarPeriode.forEach(p => {
    const obj: Record<string, number> = {};
    daftarWilayah.forEach(w => kategoriList.forEach(k => { obj[`${w}__${k}`] = 0; }));
    peta.set(p, obj);
  });
  rows.forEach(r => {
    const periode = ambilPeriode(r);
    const kategori = ambilKategori(r);
    if (!periode || !kategori || !peta.has(periode)) return;
    const obj = peta.get(periode)!;
    const key = `${r.wilayah_kerja}__${kategori}`;
    obj[key] = (obj[key] || 0) + 1;
  });
  return daftarPeriode.map(periode => ({ periode, ...peta.get(periode)! }));
}

export const hitungTrenMingguanHasilPerWilayah = (rows: HivRow[], tahun: number, daftarWilayah: string[]) =>
  pivotTrenPerWilayahKategori(rows, buatDaftarPeriodeMingguan(tahun), ambilPeriodeMingguan, r => r.hasil, daftarWilayah, KATEGORI_HASIL);

export const hitungTrenMingguanHubunganBerisikoPerWilayah = (rows: HivRow[], tahun: number, daftarWilayah: string[]) =>
  pivotTrenPerWilayahKategori(rows, buatDaftarPeriodeMingguan(tahun), ambilPeriodeMingguan, r => r.hubungan_berisiko, daftarWilayah, KATEGORI_HUBUNGAN_BERISIKO);

export const hitungTrenBulananHasilPerWilayah = (rows: HivRow[], tahun: number, daftarWilayah: string[]) =>
  pivotTrenPerWilayahKategori(rows, buatDaftarPeriodeBulanan(tahun), ambilPeriodeBulanan, r => r.hasil, daftarWilayah, KATEGORI_HASIL);

export const hitungTrenBulananHubunganBerisikoPerWilayah = (rows: HivRow[], tahun: number, daftarWilayah: string[]) =>
  pivotTrenPerWilayahKategori(rows, buatDaftarPeriodeBulanan(tahun), ambilPeriodeBulanan, r => r.hubungan_berisiko, daftarWilayah, KATEGORI_HUBUNGAN_BERISIKO);