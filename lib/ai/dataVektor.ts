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
  kodeWilker: string
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vektor_dbd')
    .select(KOLOM_VEKTOR_DBD)
    .eq('kode_wilker', kodeWilker)
    .gte('tgl_survei', tglMulai)
    .lte('tgl_survei', tglSelesai);

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

async function namaWilker(kodeWilker: string): Promise<string> {
  const daftar = await getWilkerRef();
  return daftar.find((w) => w.kode === kodeWilker)?.nama ?? kodeWilker;
}

/**
 * kodeWilker WAJIB diisi. metrik menentukan kolom mana yang dikirim ke
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
  if (!kodeWilker) {
    throw new Error(
      'Analisis/Prediksi AI untuk data vektor DBD wajib memilih satu Wilayah Kerja tertentu, tidak berlaku untuk rekap "Semua Wilayah Kerja".'
    );
  }

  const labelWilayah = await namaWilker(kodeWilker);
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);
  const kunci = KUNCI_PER_METRIK[metrik];
  const labelMetrik = LABEL_PER_METRIK[metrik];

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);
    const sebelumnya = periodeMingguanSebelumnya(p);
    const rentangSaatIni = getRentangMingguEpid(p.tahun, p.minggu);
    const rentangSebelumnya = getRentangMingguEpid(sebelumnya.tahun, sebelumnya.minggu);

    const [saatIniPenuh, sebelumnyaPenuh, breakdownZona] = await Promise.all([
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
    ]);

    return {
      labelKonteks: `Vektor Aedes (DBD) — ${labelMetrik} — Mingguan`,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeMingguan(p),
      labelPeriodeSebelumnya: labelPeriodeMingguan(sebelumnya),
      ringkasanSaatIni: saring(saatIniPenuh, kunci),
      ringkasanSebelumnya: saring(sebelumnyaPenuh, kunci),
      topKategori: breakdownZona.map((k) => ({ kategori: 'zona', nilai: k.kategori, jumlah: k.jumlah })),
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

  const [saatIniPenuh, sebelumnyaPenuh, breakdownZona] = await Promise.all([
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
  ]);

  return {
    labelKonteks: `Vektor Aedes (DBD) — ${labelMetrik} — Bulanan`,
    labelWilayah,
    labelPeriodeSaatIni: labelPeriodeBulanan(p),
    labelPeriodeSebelumnya: labelPeriodeBulanan(sebelumnya),
    ringkasanSaatIni: saring(saatIniPenuh, kunci),
    ringkasanSebelumnya: saring(sebelumnyaPenuh, kunci),
    topKategori: breakdownZona.map((k) => ({ kategori: 'zona', nilai: k.kategori, jumlah: k.jumlah })),
  };
}

export async function ambilDataAnalisisVektorDbdRentang(
  periodeKey: string,
  kodeWilker: string | undefined,
  metrik: MetrikVektor = 'hi-ci-abj'
): Promise<DataAnalisis> {
  if (!kodeWilker) {
    throw new Error(
      'Analisis AI untuk data vektor DBD wajib memilih satu Wilayah Kerja tertentu, tidak berlaku untuk rekap "Semua Wilayah Kerja".'
    );
  }

  const labelWilayah = await namaWilker(kodeWilker);
  const kunci = KUNCI_PER_METRIK[metrik];
  const labelMetrik = LABEL_PER_METRIK[metrik];

  if (isPeriodeRentangMingguan(periodeKey)) {
    const r = parseRentangMingguan(periodeKey);
    const rentangAwal = getRentangMingguEpid(r.tahun, r.mingguAwal);
    const rentangAkhir = getRentangMingguEpid(r.tahun, r.mingguAkhir);

    const adaSebelumnya = r.mingguAwal > 1;
    const rentangSebelumnyaAkhir = adaSebelumnya ? getRentangMingguEpid(r.tahun, r.mingguAwal - 1) : null;
    const rentangSebelumnyaAwal = adaSebelumnya ? getRentangMingguEpid(r.tahun, 1) : null;

    const [saatIniPenuh, sebelumnyaPenuh, breakdownZona] = await Promise.all([
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

    const [saatIniPenuh, sebelumnyaPenuh, breakdownZona] = await Promise.all([
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
    };
  }

  // Fallback: format periode_key LAMA (1 titik, "2026-W28") -- tetap
  // jalan seperti biasa lewat fungsi yang sudah ada.
  return ambilDataAnalisisVektorDbd(periodeKey, kodeWilker, metrik);
}