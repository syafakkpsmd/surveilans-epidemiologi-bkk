/**
 * Query functions untuk modul Alat Angkut Pesawat.
 * Mengikuti pola queriesVektorBreakdown.ts: fetch dari view
 * v_kegiatan_pesawat_rekap (bukan tabel mentah langsung), lalu
 * agregasi per minggu/bulan dilakukan di TypeScript -- supaya filter
 * kode_wilker & rentang tetap fleksibel tanpa perlu view SQL terpisah
 * untuk tiap kombinasi filter.
 *
 * PENTING: semua fungsi ringkasan/breakdown di sini HANYA menghitung
 * baris dengan status_data = 'final'. Baris 'rencana' (jadwal H+2/H+3
 * yang belum tiba tanggalnya) sengaja dikeluarkan dari statistik dan
 * hanya muncul lewat getJadwalAkanDatang().
 */

import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------
// TIPE DATA
// ---------------------------------------------------------------------
export interface RingkasanMingguanPesawat {
  minggu_epid: number;
  crew_berangkat: number;
  penumpang_berangkat: number;
  crew_datang: number;
  penumpang_datang: number;
  sklt_total: number;
  td_laik_total: number;
  iaos_total: number;
  jenazah_total: number;
  kier_total: number;
  pesawat_tiba: number;
  pesawat_berangkat: number;
  [key: string]: unknown;
}

export interface RingkasanBulananPesawat {
  bulan: string;
  crew_berangkat: number;
  penumpang_berangkat: number;
  crew_datang: number;
  penumpang_datang: number;
  sklt_total: number;
  td_laik_total: number;
  iaos_total: number;
  jenazah_total: number;
  kier_total: number;
  pesawat_tiba: number;
  pesawat_berangkat: number;
  [key: string]: unknown;
}

export interface BreakdownItemPesawat {
  kategori: string;
  jumlah: number;
}


// Baris mentah yang diambil dari view v_kegiatan_pesawat_rekap
interface BarisRekapPesawat {
  kode_wilker: string;
  nama_wilker: string;
  tanggal: string;
  epi_week: number;
  tahun: number;
  status_data: string;
  maskapai: string;
  keberangkatan: string | null;   // <-- tambahan: kota tujuan (untuk metrik kota-tujuan)
  kedatangan: string | null;      // <-- tambahan: kota asal (untuk metrik kota-asal)
  crew_berangkat: number | null;
  penumpang_berangkat: number | null;
  crew_datang: number | null;
  penumpang_datang: number | null;
  sklt_total: number | null;
  td_laik_total: number | null;
  iaos_total: number | null;
  jenazah_total: number | null;
  kier_total: number | null;
}

// ---------------------------------------------------------------------
// HELPER INTERNAL: Ambil baris final dengan limit yang aman untuk data besar
// ---------------------------------------------------------------------
async function ambilBarisFinal({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<BarisRekapPesawat[]> {
  const supabase = await createClient();

  const UKURAN_HALAMAN = 1000;
  let semuaBaris: BarisRekapPesawat[] = [];
  let halaman = 0;

  while (true) {
    let query = supabase
      .from('v_kegiatan_pesawat_rekap')
      .select('*')
      .eq('tahun', tahun)
      .eq('status_data', 'final')
      .range(halaman * UKURAN_HALAMAN, (halaman + 1) * UKURAN_HALAMAN - 1);

    if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

    const { data, error } = await query;
    if (error) throw error;

    const baris = (data ?? []) as BarisRekapPesawat[];
    semuaBaris = semuaBaris.concat(baris);

    // Kalau hasil yang didapat lebih sedikit dari ukuran halaman,
    // berarti sudah sampai baris terakhir -- stop loop.
    if (baris.length < UKURAN_HALAMAN) break;

    halaman += 1;
  }

  return semuaBaris;
}

// ---------------------------------------------------------------------
// RINGKASAN MINGGUAN
// ---------------------------------------------------------------------
export async function getRingkasanPesawatMingguan({
  tahun,
  mgDari,
  mgSampai,
  kodeWilker,
}: {
  tahun: number;
  mgDari?: number;
  mgSampai?: number;
  kodeWilker?: string;
}): Promise<RingkasanMingguanPesawat[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });

  const perMinggu = new Map<number, RingkasanMingguanPesawat>();

  for (const row of baris) {
    const mg = row.epi_week;
    if (mgDari && mg < mgDari) continue;
    if (mgSampai && mg > mgSampai) continue;

    const acc = perMinggu.get(mg) ?? {
      minggu_epid: mg,
      crew_berangkat: 0,
      penumpang_berangkat: 0,
      crew_datang: 0,
      penumpang_datang: 0,
      sklt_total: 0,
      td_laik_total: 0,
      iaos_total: 0,
      jenazah_total: 0,
      kier_total: 0,
      pesawat_tiba: 0,
      pesawat_berangkat: 0,
    };

    acc.crew_berangkat += row.crew_berangkat ?? 0;
    acc.penumpang_berangkat += row.penumpang_berangkat ?? 0;
    acc.crew_datang += row.crew_datang ?? 0;
    acc.penumpang_datang += row.penumpang_datang ?? 0;
    acc.sklt_total += row.sklt_total ?? 0;
    acc.td_laik_total += row.td_laik_total ?? 0;
    acc.iaos_total += row.iaos_total ?? 0;
    acc.jenazah_total += row.jenazah_total ?? 0;
    acc.kier_total += row.kier_total ?? 0;
    acc.pesawat_tiba += 1;
    acc.pesawat_berangkat += 1;

    perMinggu.set(mg, acc);
  }

  return Array.from(perMinggu.values()).sort((a, b) => a.minggu_epid - b.minggu_epid);
}

// ---------------------------------------------------------------------
// RINGKASAN BULANAN
// ---------------------------------------------------------------------
export async function getRingkasanPesawatBulanan({
  tahun,
  kodeWilker,
  bulanDari,
  bulanSampai,
}: {
  tahun: number;
  kodeWilker?: string;
  bulanDari?: string; // 'YYYY-MM'
  bulanSampai?: string; // 'YYYY-MM'
}): Promise<RingkasanBulananPesawat[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });

  const perBulan = new Map<string, RingkasanBulananPesawat>();

  for (const row of baris) {
    const bulan = String(row.tanggal).slice(0, 7); // 'YYYY-MM'
    if (bulanDari && bulan < bulanDari) continue;
    if (bulanSampai && bulan > bulanSampai) continue;

    const acc = perBulan.get(bulan) ?? {
      bulan,
      crew_berangkat: 0,
      penumpang_berangkat: 0,
      crew_datang: 0,
      penumpang_datang: 0,
      sklt_total: 0,
      td_laik_total: 0,
      iaos_total: 0,
      jenazah_total: 0,
      kier_total: 0,
      pesawat_tiba: 0,
      pesawat_berangkat: 0,
    };

    acc.crew_berangkat += row.crew_berangkat ?? 0;
    acc.penumpang_berangkat += row.penumpang_berangkat ?? 0;
    acc.crew_datang += row.crew_datang ?? 0;
    acc.penumpang_datang += row.penumpang_datang ?? 0;
    acc.sklt_total += row.sklt_total ?? 0;
    acc.td_laik_total += row.td_laik_total ?? 0;
    acc.iaos_total += row.iaos_total ?? 0;
    acc.jenazah_total += row.jenazah_total ?? 0;
    acc.kier_total += row.kier_total ?? 0;
    acc.pesawat_tiba += 1;
    acc.pesawat_berangkat += 1;

    perBulan.set(bulan, acc);
  }

  return Array.from(perBulan.values()).sort((a, b) => a.bulan.localeCompare(b.bulan));
}

// ---------------------------------------------------------------------
// BREAKDOWN PER MASKAPAI (total penumpang berangkat+datang)
// ---------------------------------------------------------------------
export async function getBreakdownMaskapai({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<BreakdownItemPesawat[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });

  const perMaskapai = new Map<string, number>();
  for (const row of baris) {
    const total = (row.penumpang_berangkat ?? 0) + (row.penumpang_datang ?? 0);
    perMaskapai.set(row.maskapai, (perMaskapai.get(row.maskapai) ?? 0) + total);
  }

  return Array.from(perMaskapai.entries())
    .map(([kategori, jumlah]) => ({ kategori, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

// ---------------------------------------------------------------------
// BREAKDOWN MASKAPAI KEDATANGAN, PER MINGGU / PER BULAN
// (beda dari getBreakdownMaskapai: itu total setahun & gabung arah;
// ini dipecah per periode & KHUSUS kedatangan, untuk AI Analisis/Prediksi)
// ---------------------------------------------------------------------
export interface RingkasanMaskapaiMingguan {
  minggu_epid: number;
  maskapai: string;
  penumpang_datang: number;
  crew_datang: number;
}

export interface RingkasanMaskapaiBulanan {
  bulan: string; // 'YYYY-MM'
  maskapai: string;
  penumpang_datang: number;
  crew_datang: number;
}

export async function getRingkasanMaskapaiKedatanganMingguan({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<RingkasanMaskapaiMingguan[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });
  const peta = new Map<string, RingkasanMaskapaiMingguan>();

  for (const row of baris) {
    const kunci = `${row.epi_week}|${row.maskapai}`;
    const acc = peta.get(kunci) ?? {
      minggu_epid: row.epi_week,
      maskapai: row.maskapai,
      penumpang_datang: 0,
      crew_datang: 0,
    };
    acc.penumpang_datang += row.penumpang_datang ?? 0;
    acc.crew_datang += row.crew_datang ?? 0;
    peta.set(kunci, acc);
  }

  return Array.from(peta.values());
}

export async function getRingkasanMaskapaiKedatanganBulanan({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<RingkasanMaskapaiBulanan[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });
  const peta = new Map<string, RingkasanMaskapaiBulanan>();

  for (const row of baris) {
    const bulan = String(row.tanggal).slice(0, 7);
    const kunci = `${bulan}|${row.maskapai}`;
    const acc = peta.get(kunci) ?? {
      bulan,
      maskapai: row.maskapai,
      penumpang_datang: 0,
      crew_datang: 0,
    };
    acc.penumpang_datang += row.penumpang_datang ?? 0;
    acc.crew_datang += row.crew_datang ?? 0;
    peta.set(kunci, acc);
  }

  return Array.from(peta.values());
}

// ---------------------------------------------------------------------
// BREAKDOWN KOTA ASAL (kedatangan), PER MINGGU / PER BULAN
// kolom `kedatangan` = kota asal pesawat yang DATANG ke bandara ini
// ---------------------------------------------------------------------
export interface RingkasanKotaMingguan {
  minggu_epid: number;
  kota: string;
  penumpang_datang: number;
  crew_datang: number;
}

export interface RingkasanKotaBulanan {
  bulan: string; // 'YYYY-MM'
  kota: string;
  penumpang_datang: number;
  crew_datang: number;
}

export async function getRingkasanKotaAsalMingguan({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<RingkasanKotaMingguan[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });
  const peta = new Map<string, RingkasanKotaMingguan>();

  for (const row of baris) {
    const kota = row.kedatangan?.trim();
    if (!kota) continue; // lewati baris tanpa kota asal terisi

    const kunci = `${row.epi_week}|${kota}`;
    const acc = peta.get(kunci) ?? {
      minggu_epid: row.epi_week,
      kota,
      penumpang_datang: 0,
      crew_datang: 0,
    };
    acc.penumpang_datang += row.penumpang_datang ?? 0;
    acc.crew_datang += row.crew_datang ?? 0;
    peta.set(kunci, acc);
  }

  return Array.from(peta.values());
}

export async function getRingkasanKotaAsalBulanan({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<RingkasanKotaBulanan[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });
  const peta = new Map<string, RingkasanKotaBulanan>();

  for (const row of baris) {
    const kota = row.kedatangan?.trim();
    if (!kota) continue;

    const bulan = String(row.tanggal).slice(0, 7);
    const kunci = `${bulan}|${kota}`;
    const acc = peta.get(kunci) ?? {
      bulan,
      kota,
      penumpang_datang: 0,
      crew_datang: 0,
    };
    acc.penumpang_datang += row.penumpang_datang ?? 0;
    acc.crew_datang += row.crew_datang ?? 0;
    peta.set(kunci, acc);
  }

  return Array.from(peta.values());
}

// ---------------------------------------------------------------------
// BREAKDOWN PER JENIS SERTIFIKAT (total semua kategori)
// ---------------------------------------------------------------------
export async function getBreakdownSertifikat({
  tahun,
  kodeWilker,
}: {
  tahun: number;
  kodeWilker?: string;
}): Promise<BreakdownItemPesawat[]> {
  const baris = await ambilBarisFinal({ tahun, kodeWilker });

  const totals = {
    SKLT: 0,
    'TD Laik': 0,
    IAOS: 0,
    Jenazah: 0,
    KIER: 0,
  };

  for (const row of baris) {
    totals.SKLT += row.sklt_total ?? 0;
    totals['TD Laik'] += row.td_laik_total ?? 0;
    totals.IAOS += row.iaos_total ?? 0;
    totals.Jenazah += row.jenazah_total ?? 0;
    totals.KIER += row.kier_total ?? 0;
  }

  return Object.entries(totals).map(([kategori, jumlah]) => ({ kategori, jumlah }));
}


// ---------------------------------------------------------------------
// RINGKASAN GENDER BULANAN (breakdown per jenis sertifikat x gender)
// ---------------------------------------------------------------------
export interface RingkasanGenderBulanan {
  bulan: string; // 'YYYY-MM'
  sklt_male: number;
  sklt_female: number;
  td_laik_male: number;
  td_laik_female: number;
  iaos_male: number;
  iaos_female: number;
  jenazah_male: number;
  jenazah_female: number;
  kier_male: number;
  kier_female: number;
}

export async function getRingkasanGenderBulanan({
  tahun,
  kodeWilker,
  bulanDari,
  bulanSampai,
}: {
  tahun: number;
  kodeWilker?: string;
  bulanDari?: string;
  bulanSampai?: string;
}): Promise<RingkasanGenderBulanan[]> {
  const supabase = await createClient();

  const UKURAN_HALAMAN = 1000;
  let semuaBaris: any[] = [];
  let halaman = 0;

  while (true) {
    let query = supabase
      .from('kegiatan_pesawat')
      .select(
        'tanggal, kode_wilker, sklt_male, sklt_female, td_laik_male, td_laik_female, iaos_male, iaos_female, jenazah_male, jenazah_female, kier_male, kier_female'
      )
      .eq('status_data', 'final')
      .gte('tanggal', `${tahun}-01-01`)
      .lte('tanggal', `${tahun}-12-31`)
      .range(halaman * UKURAN_HALAMAN, (halaman + 1) * UKURAN_HALAMAN - 1);

    if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

    const { data, error } = await query;
    if (error) throw error;

    const baris = data ?? [];
    semuaBaris = semuaBaris.concat(baris);

    if (baris.length < UKURAN_HALAMAN) break;
    halaman += 1;
  }

  const perBulan = new Map<string, RingkasanGenderBulanan>();

  for (const row of semuaBaris) {
    const bulan = String(row.tanggal).slice(0, 7);
    if (bulanDari && bulan < bulanDari) continue;
    if (bulanSampai && bulan > bulanSampai) continue;

    const acc = perBulan.get(bulan) ?? {
      bulan,
      sklt_male: 0, sklt_female: 0,
      td_laik_male: 0, td_laik_female: 0,
      iaos_male: 0, iaos_female: 0,
      jenazah_male: 0, jenazah_female: 0,
      kier_male: 0, kier_female: 0,
    };

    acc.sklt_male += row.sklt_male ?? 0;
    acc.sklt_female += row.sklt_female ?? 0;
    acc.td_laik_male += row.td_laik_male ?? 0;
    acc.td_laik_female += row.td_laik_female ?? 0;
    acc.iaos_male += row.iaos_male ?? 0;
    acc.iaos_female += row.iaos_female ?? 0;
    acc.jenazah_male += row.jenazah_male ?? 0;
    acc.jenazah_female += row.jenazah_female ?? 0;
    acc.kier_male += row.kier_male ?? 0;
    acc.kier_female += row.kier_female ?? 0;

    perBulan.set(bulan, acc);
  }

  return Array.from(perBulan.values()).sort((a, b) => a.bulan.localeCompare(b.bulan));
}