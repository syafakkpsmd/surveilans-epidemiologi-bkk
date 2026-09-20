// ================================================================
// lib/ai/dataVektor.ts
// ================================================================

import { createClient } from '@/lib/supabase/server';
import { getRentangMingguEpid, getBreakdownKategori } from '@/lib/supabase/queriesVektorBreakdown';
import { getWilkerRef } from '@/lib/supabase/queries';
import {
  parsePeriodeMingguan,
  parsePeriodeBulanan,
  periodeMingguanSebelumnya,
  periodeBulananSebelumnya,
  labelPeriodeMingguan,
  labelPeriodeBulanan,
  isPeriodeRentangMingguan,
  isPeriodeRentangBulanan,
  parseRentangMingguan,
  parseRentangBulanan,
  labelRentangMingguan,
  labelRentangBulanan,
} from './periode';
import type { DataAnalisis } from './data';

const KOLOM_VEKTOR_DBD =
  'hi, ci, bi, abj, jml_rumah_diperiksa, jml_positif_jentik, container_diperiksa, container_positif, curah_hujan_mm, larvasida_gram, luas_wilayah_fogging_ha, jml_insektisida_fogging_ml';

const KOLOM_RERATA = ['hi', 'ci', 'bi', 'abj', 'curah_hujan_mm'] as const;
const KOLOM_TOTAL = [
  'jml_rumah_diperiksa',
  'jml_positif_jentik',
  'container_diperiksa',
  'container_positif',
  'larvasida_gram',
  'luas_wilayah_fogging_ha',
  'jml_insektisida_fogging_ml',
] as const;

/** Grafik mana yang tombol Analisis AI-nya diklik -- menentukan kolom mana saja yang relevan ditampilkan ke prompt & apa fokus rekomendasinya. Default 'hi-ci-abj' (perilaku lama, juga dipakai Prediksi AI). */
export type MetrikVektor =
  | 'hi-ci-abj'
  | 'rumah-diperiksa'
  | 'container-diperiksa'
  | 'rumah-container-positif'
  | 'larvasida'
  | 'luas-insektisida';

const KUNCI_PER_METRIK: Record<MetrikVektor, string[]> = {
  'hi-ci-abj': ['jml_survei', 'hi_rerata', 'ci_rerata', 'bi_rerata', 'abj_rerata', 'curah_hujan_mm_rerata'],
  'rumah-diperiksa': ['jml_survei', 'jml_rumah_diperiksa_total'],
  'container-diperiksa': ['jml_survei', 'container_diperiksa_total'],
  'rumah-container-positif': [
    'jml_survei',
    'jml_rumah_diperiksa_total',
    'jml_positif_jentik_total',
    'container_diperiksa_total',
    'container_positif_total',
  ],
  larvasida: ['jml_survei', 'larvasida_gram_total'],
  'luas-insektisida': ['jml_survei', 'luas_wilayah_fogging_ha_total', 'jml_insektisida_fogging_ml_total'],
};

const LABEL_PER_METRIK: Record<MetrikVektor, string> = {
  'hi-ci-abj': 'HI/CI/BI/ABJ & Curah Hujan',
  'rumah-diperiksa': 'Rumah Diperiksa',
  'container-diperiksa': 'Container Diperiksa',
  'rumah-container-positif': 'Rumah Positif + Container Positif',
  larvasida: 'Penggunaan Larvasida',
  'luas-insektisida': 'Luas Wilayah Fogging + Insektisida Fogging',
};

function saring(ringkasan: Record<string, number>, kunci: string[]): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const k of kunci) if (k in ringkasan) hasil[k] = ringkasan[k];
  return hasil;
}

function rerata(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

async function ringkasVektorDbdRentang(
  tglMulai: string,
  tglSelesai: string,
  kodeWilker: string | undefined
): Promise<Record<string, number>> {
  const supabase = await createClient();
  let query = supabase
    .from('vektor_dbd')
    .select(KOLOM_VEKTOR_DBD)
    .gte('tgl_survei', tglMulai)
    .lte('tgl_survei', tglSelesai);
  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);
  const { data, error } = await query;

  if (error) throw new Error(`Gagal ambil data vektor_dbd untuk analisis AI: ${error.message}`);

  const baris = (data ?? []) as Record<string, number | null>[];
  const hasil: Record<string, number> = { jml_survei: baris.length };

  for (const k of KOLOM_RERATA) {
    const nilai = baris.map((b) => b[k]).filter((v): v is number => v !== null && v !== undefined);
    hasil[`${k}_rerata`] = Number(rerata(nilai).toFixed(2));
  }
  for (const k of KOLOM_TOTAL) {
    hasil[`${k}_total`] = baris.reduce((total, b) => total + (Number(b[k]) || 0), 0);
  }
  return hasil;
}

/**
 * breakdownWilayahVektorDbd
 * ---------------------------
 * Rata-rata indeks HI (House Index -- indikator DBD yang paling umum
 * dipakai untuk membandingkan tingkat risiko antar wilayah) PER
 * WILAYAH KERJA untuk 1 rentang tanggal, TANPA filter kode_wilker
 * (supaya dapat baris SEMUA wilayah kerja). Dipakai untuk mengisi
 * DataAnalisis.breakdownWilayahSaatIni pada vektor-dbd-mingguan/
 * bulanan waktu mode "Semua Wilayah Kerja" dipilih.
 *
 * SENGAJA pakai rata-rata HI per wilayah (bukan dijumlahkan!) --
 * HI/CI/BI/ABJ adalah indeks persentase, menjumlahkannya antar
 * wilayah tidak bermakna epidemiologis. Rata-rata per wilayah inilah
 * yang bisa dibandingkan apa adanya untuk menentukan wilayah kerja
 * mana yang paling berisiko.
 */
async function breakdownWilayahVektorDbd(
  tglMulai: string,
  tglSelesai: string
): Promise<{ wilayah: string; jumlah: number }[]> {
  const supabase = await createClient();
  const [{ data, error }, daftarWilker] = await Promise.all([
    supabase
      .from('vektor_dbd')
      .select('kode_wilker, hi')
      .gte('tgl_survei', tglMulai)
      .lte('tgl_survei', tglSelesai),
    getWilkerRef(),
  ]);
  if (error) throw new Error(`Gagal ambil breakdown HI vektor_dbd per wilayah: ${error.message}`);

  const wilkerMap = new Map<string, string>();
  (daftarWilker ?? []).forEach((w) => { if (w.kode && w.nama) wilkerMap.set(w.kode, w.nama); });

  const perWilker = new Map<string, number[]>();
  for (const r of (data ?? []) as { kode_wilker: string | null; hi: number | null }[]) {
    if (!r.kode_wilker || r.hi === null || r.hi === undefined) continue;
    if (!perWilker.has(r.kode_wilker)) perWilker.set(r.kode_wilker, []);
    perWilker.get(r.kode_wilker)!.push(r.hi);
  }

  return Array.from(perWilker.entries())
    .map(([kode, nilai]) => ({
      wilayah: wilkerMap.get(kode) ?? kode,
      jumlah: Number(rerata(nilai).toFixed(2)),
    }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

async function namaWilker(kodeWilker: string): Promise<string> {
  const daftar = await getWilkerRef();
  return daftar.find((w) => w.kode === kodeWilker)?.nama ?? kodeWilker;
}

/**
 * kodeWilker OPSIONAL (undefined = "Semua Wilayah Kerja", aggregat +
 * breakdownWilayahSaatIni berisi rata-rata HI per wilayah -- lihat
 * breakdownWilayahVektorDbd di atas untuk alasan kenapa dirata-rata,
 * bukan dijumlahkan). metrik menentukan kolom mana yang dikirim ke
 * prompt AI -- supaya tombol Analisis AI di tiap grafik (poin #6) hanya
 * membahas data grafik itu, bukan seluruh indikator vektor sekaligus.
 * Default 'hi-ci-abj' untuk kompatibilitas mundur (dipakai Prediksi AI
 * yang memang HANYA berlaku untuk HI/CI/BI/ABJ/Curah Hujan).
 */
export async function ambilDataAnalisisVektorDbd(
  periodeKey: string,
  kodeWilker: string | undefined,
  metrik: MetrikVektor = 'hi-ci-abj'
): Promise<DataAnalisis> {
  const labelWilayah = kodeWilker
    ? await namaWilker(kodeWilker)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);
  const kunci = KUNCI_PER_METRIK[metrik];
  const labelMetrik = LABEL_PER_METRIK[metrik];

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);
    const sebelumnya = periodeMingguanSebelumnya(p);
    const rentangSaatIni = getRentangMingguEpid(p.tahun, p.minggu);
    const rentangSebelumnya = getRentangMingguEpid(sebelumnya.tahun, sebelumnya.minggu);

    const [saatIniPenuh, sebelumnyaPenuh, breakdownZona, breakdownWilayahSaatIni] = await Promise.all([
      ringkasVektorDbdRentang(rentangSaatIni.mulai, rentangSaatIni.selesai, kodeWilker),
      ringkasVektorDbdRentang(rentangSebelumnya.mulai, rentangSebelumnya.selesai, kodeWilker),
      getBreakdownKategori({
        tabel: 'vektor_dbd',
        kolomTanggal: 'tgl_survei',
        kolomKategori: 'zona',
        tglMulai: rentangSaatIni.mulai,
        tglSelesai: rentangSaatIni.selesai,
        kodeWilker,
      }),
      kodeWilker ? Promise.resolve(undefined) : breakdownWilayahVektorDbd(rentangSaatIni.mulai, rentangSaatIni.selesai),
    ]);

    return {
      labelKonteks: `Vektor Aedes (DBD) — ${labelMetrik} — Mingguan`,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeMingguan(p),
      labelPeriodeSebelumnya: labelPeriodeMingguan(sebelumnya),
      ringkasanSaatIni: saring(saatIniPenuh, kunci),
      ringkasanSebelumnya: saring(sebelumnyaPenuh, kunci),
      topKategori: breakdownZona.map((k) => ({ kategori: 'zona', nilai: k.kategori, jumlah: k.jumlah })),
      breakdownWilayahSaatIni,
    };
  }

  const p = parsePeriodeBulanan(periodeKey);
  const sebelumnya = periodeBulananSebelumnya(p);
  const tglMulaiSaatIni = `${p.tahun}-${String(p.bulan).padStart(2, '0')}-01`;
  const tglSelesaiSaatIni = new Date(Date.UTC(p.tahun, p.bulan, 0)).toISOString().split('T')[0];
  const tglMulaiSebelumnya = `${sebelumnya.tahun}-${String(sebelumnya.bulan).padStart(2, '0')}-01`;
  const tglSelesaiSebelumnya = new Date(Date.UTC(sebelumnya.tahun, sebelumnya.bulan, 0))
    .toISOString()
    .split('T')[0];

  const [saatIniPenuh, sebelumnyaPenuh, breakdownZona, breakdownWilayahSaatIni] = await Promise.all([
    ringkasVektorDbdRentang(tglMulaiSaatIni, tglSelesaiSaatIni, kodeWilker),
    ringkasVektorDbdRentang(tglMulaiSebelumnya, tglSelesaiSebelumnya, kodeWilker),
    getBreakdownKategori({
      tabel: 'vektor_dbd',
      kolomTanggal: 'tgl_survei',
      kolomKategori: 'zona',
      tglMulai: tglMulaiSaatIni,
      tglSelesai: tglSelesaiSaatIni,
      kodeWilker,
    }),
    kodeWilker ? Promise.resolve(undefined) : breakdownWilayahVektorDbd(tglMulaiSaatIni, tglSelesaiSaatIni),
  ]);

  return {
    labelKonteks: `Vektor Aedes (DBD) — ${labelMetrik} — Bulanan`,
    labelWilayah,
    labelPeriodeSaatIni: labelPeriodeBulanan(p),
    labelPeriodeSebelumnya: labelPeriodeBulanan(sebelumnya),
    ringkasanSaatIni: saring(saatIniPenuh, kunci),
    ringkasanSebelumnya: saring(sebelumnyaPenuh, kunci),
    topKategori: breakdownZona.map((k) => ({ kategori: 'zona', nilai: k.kategori, jumlah: k.jumlah })),
    breakdownWilayahSaatIni,
  };
}

export async function ambilDataAnalisisVektorDbdRentang(
  periodeKey: string,
  kodeWilker: string | undefined,
  metrik: MetrikVektor = 'hi-ci-abj'
): Promise<DataAnalisis> {
  const labelWilayah = kodeWilker
    ? await namaWilker(kodeWilker)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const kunci = KUNCI_PER_METRIK[metrik];
  const labelMetrik = LABEL_PER_METRIK[metrik];

  if (isPeriodeRentangMingguan(periodeKey)) {
    const r = parseRentangMingguan(periodeKey);
    const rentangAwal = getRentangMingguEpid(r.tahun, r.mingguAwal);
    const rentangAkhir = getRentangMingguEpid(r.tahun, r.mingguAkhir);

    const adaSebelumnya = r.mingguAwal > 1;
    const rentangSebelumnyaAkhir = adaSebelumnya ? getRentangMingguEpid(r.tahun, r.mingguAwal - 1) : null;
    const rentangSebelumnyaAwal = adaSebelumnya ? getRentangMingguEpid(r.tahun, 1) : null;

    const [saatIniPenuh, sebelumnyaPenuh, breakdownZona, breakdownWilayahSaatIni] = await Promise.all([
      ringkasVektorDbdRentang(rentangAwal.mulai, rentangAkhir.selesai, kodeWilker),
      adaSebelumnya
        ? ringkasVektorDbdRentang(rentangSebelumnyaAwal!.mulai, rentangSebelumnyaAkhir!.selesai, kodeWilker)
        : Promise.resolve({}),
      getBreakdownKategori({
        tabel: 'vektor_dbd',
        kolomTanggal: 'tgl_survei',
        kolomKategori: 'zona',
        tglMulai: rentangAwal.mulai,
        tglSelesai: rentangAkhir.selesai,
        kodeWilker,
      }),
      kodeWilker ? Promise.resolve(undefined) : breakdownWilayahVektorDbd(rentangAwal.mulai, rentangAkhir.selesai),
    ]);

    return {
      labelKonteks: `Vektor Aedes (DBD) — ${labelMetrik} — Rentang Mingguan`,
      labelWilayah,
      labelPeriodeSaatIni: labelRentangMingguan(r),
      labelPeriodeSebelumnya: adaSebelumnya
        ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
        : 'Tidak ada data sebelum minggu ke-1',
      ringkasanSaatIni: saring(saatIniPenuh, kunci),
      ringkasanSebelumnya: saring(sebelumnyaPenuh, kunci),
      topKategori: breakdownZona.map((k) => ({ kategori: 'zona', nilai: k.kategori, jumlah: k.jumlah })),
      breakdownWilayahSaatIni,
    };
  }

  if (isPeriodeRentangBulanan(periodeKey)) {
    const r = parseRentangBulanan(periodeKey);
    const tglMulai = `${r.tahun}-${String(r.bulanAwal).padStart(2, '0')}-01`;
    const tglSelesai = new Date(Date.UTC(r.tahun, r.bulanAkhir, 0)).toISOString().split('T')[0];

    const adaSebelumnya = r.bulanAwal > 1;
    const tglMulaiSebelumnya = `${r.tahun}-01-01`;
    const tglSelesaiSebelumnya = adaSebelumnya
      ? new Date(Date.UTC(r.tahun, r.bulanAwal - 1, 0)).toISOString().split('T')[0]
      : '';

    const [saatIniPenuh, sebelumnyaPenuh, breakdownZona, breakdownWilayahSaatIni] = await Promise.all([
      ringkasVektorDbdRentang(tglMulai, tglSelesai, kodeWilker),
      adaSebelumnya
        ? ringkasVektorDbdRentang(tglMulaiSebelumnya, tglSelesaiSebelumnya, kodeWilker)
        : Promise.resolve({}),
      getBreakdownKategori({
        tabel: 'vektor_dbd',
        kolomTanggal: 'tgl_survei',
        kolomKategori: 'zona',
        tglMulai,
        tglSelesai,
        kodeWilker,
      }),
      kodeWilker ? Promise.resolve(undefined) : breakdownWilayahVektorDbd(tglMulai, tglSelesai),
    ]);

    return {
      labelKonteks: `Vektor Aedes (DBD) — ${labelMetrik} — Rentang Bulanan`,
      labelWilayah,
      labelPeriodeSaatIni: labelRentangBulanan(r),
      labelPeriodeSebelumnya: adaSebelumnya
        ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
        : 'Tidak ada data sebelum bulan pertama',
      ringkasanSaatIni: saring(saatIniPenuh, kunci),
      ringkasanSebelumnya: saring(sebelumnyaPenuh, kunci),
      topKategori: breakdownZona.map((k) => ({ kategori: 'zona', nilai: k.kategori, jumlah: k.jumlah })),
      breakdownWilayahSaatIni,
    };
  }

  // Fallback: format periode_key LAMA (1 titik, "2026-W28") -- tetap
  // jalan seperti biasa lewat fungsi yang sudah ada.
  return ambilDataAnalisisVektorDbd(periodeKey, kodeWilker, metrik);
}