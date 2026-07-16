import { createClient } from '@/lib/supabase/server';
import {
  getRingkasanMingguan,
  getRingkasanBulanan,
  getKategoriBreakdown,
} from '@/lib/supabase/queries';
import type { Wilayah, KategoriCop } from '@/types/database.types';
import {
  parsePeriodeMingguan,
  parsePeriodeBulanan,
  periodeMingguanSebelumnya,
  periodeBulananSebelumnya,
  labelPeriodeMingguan,
  labelPeriodeBulanan,
  type PeriodeMingguan,
  type PeriodeBulanan,
} from './periode';
import { ambilDataAnalisisVektorDbd, type MetrikVektor } from './dataVektor';

export const KONTEKS_TREN = [
  'dashboard-utama',
  'alat-angkut-ringkasan',
  'cop-mingguan',
  'cop-bulanan',
  'phqc-mingguan',
  'phqc-bulanan',
  'penumpang-mingguan',
  'penumpang-bulanan',
  'pesawat-mingguan',
  'pesawat-bulanan',
  'vektor-dbd-mingguan',
  'vektor-dbd-bulanan',
  'global-emerging-mingguan',
  'global-emerging-bulanan',
] as const;

export const KONTEKS_BREAKDOWN = [
  'cop-rba',
  'cop-negara-asal',
  'cop-faktor-risiko',
  'phqc-daerah-asal',
  'phqc-rba-mingguan',
  'phqc-rba-bulanan',
  'phqc-pelabuhan-mingguan',
  'phqc-pelabuhan-bulanan',
] as const;

/**
 * Konteks yang boleh dipakai untuk tipe="prediksi". Vektor tetap
 * ditangani terpisah lewat isKonteksVektor() (route.ts). Daftar ini
 * KHUSUS untuk breakdown/tren non-vektor yang sudah punya prompt
 * prediksi tersendiri di lib/ai/prompt.ts.
 */
export const KONTEKS_PREDIKSI_NON_VEKTOR = [
  'cop-rba',
  'cop-negara-asal',
  'phqc-daerah-asal',
  'phqc-rba-mingguan',
  'phqc-rba-bulanan',
  'penumpang-mingguan',
  'penumpang-bulanan',
  'pesawat-mingguan',
  'pesawat-bulanan',
  'global-emerging-mingguan',
  'global-emerging-bulanan',
] as const;

export const KONTEKS_VALID = [...KONTEKS_TREN, ...KONTEKS_BREAKDOWN, ...KONTEKS_PREDIKSI_NON_VEKTOR] as const;

export type KonteksTren = (typeof KONTEKS_TREN)[number];
export type KonteksBreakdown = (typeof KONTEKS_BREAKDOWN)[number];
export type KonteksAnalisis = (typeof KONTEKS_VALID)[number];

export function isKonteksValid(nilai: string): nilai is KonteksAnalisis {
  return (KONTEKS_VALID as readonly string[]).includes(nilai);
}

export function isKonteksTren(konteks: KonteksAnalisis): konteks is KonteksTren {
  return (KONTEKS_TREN as readonly string[]).includes(konteks);
}

export function isKonteksBreakdown(konteks: KonteksAnalisis): konteks is KonteksBreakdown {
  return (KONTEKS_BREAKDOWN as readonly string[]).includes(konteks);
}

export function isKonteksVektor(konteks: KonteksAnalisis): boolean {
  return konteks.startsWith('vektor-');
}

export function isKonteksPrediksiNonVektorValid(konteks: string): boolean {
  return (KONTEKS_PREDIKSI_NON_VEKTOR as readonly string[]).includes(konteks);
}

export type DataAnalisis = {
  labelKonteks: string;
  labelWilayah: string;
  labelPeriodeSaatIni: string;
  labelPeriodeSebelumnya: string;
  ringkasanSaatIni: Record<string, number>;
  ringkasanSebelumnya: Record<string, number>;
  topKategori: { kategori: string; nilai: string; jumlah: number }[];
};

function jumlahkanRingkasan<T extends Record<string, unknown>>(
  baris: T[],
  kolomAngka: (keyof T)[]
): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const kolom of kolomAngka) {
    hasil[kolom as string] = baris.reduce((total, b) => total + (Number(b[kolom]) || 0), 0);
  }
  return hasil;
}

function cariAtauJumlahkan<T extends Record<string, unknown>>(
  baris: T[],
  wilayahKerja: string | undefined,
  kolomAngka: (keyof T)[]
): Record<string, number> {
  if (wilayahKerja) {
    const cocok = baris.find((b) => b.wilayah_kerja === wilayahKerja);
    if (!cocok) {
      return Object.fromEntries(kolomAngka.map((k) => [k as string, 0]));
    }
    return Object.fromEntries(kolomAngka.map((k) => [k as string, Number(cocok[k]) || 0]));
  }
  return jumlahkanRingkasan(baris, kolomAngka);
}

const KOLOM_ANGKA_COP = ['jumlah_kapal', 'total_abk', 'total_abk_wna', 'total_abk_wni'] as const;
const KOLOM_ANGKA_PHQC = [
  'jumlah_kapal', 'total_abk', 'total_abk_wna', 'total_abk_wni',
  'total_penumpang', 'total_penumpang_wna', 'total_penumpang_wni',
] as const;
/**
 * CATATAN: kolom penumpang yang tersedia saat ini di tabel phqc HANYA
 * total_penumpang (+ split WNA/WNI) -- BELUM ada pemisahan arah
 * tiba/berangkat di skema yang saya lihat. Fungsi di bawah untuk
 * sementara menyajikan total volume penumpang PHQC (semua dianggap
 * "tiba" karena PHQC dilakukan saat kapal bersandar/kedatangan).
 * Kalau kamu punya kolom/tabel terpisah untuk keberangkatan, kasih
 * tahu nama kolomnya supaya saya sesuaikan fungsi ini.
 */
const KOLOM_ANGKA_PENUMPANG = ['total_penumpang', 'total_penumpang_wna', 'total_penumpang_wni'] as const;

async function ambilCopMingguan(
  p: PeriodeMingguan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanMingguan('cop', p.tahun);
  const barisMinggu = baris.filter((b) => b.minggu_epid === p.minggu);
  return cariAtauJumlahkan(barisMinggu, wilayahKerja, [...KOLOM_ANGKA_COP]);
}

async function ambilCopBulanan(
  p: PeriodeBulanan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanBulanan('cop', p.tahun);
  const barisBulan = baris.filter((b) => b.bulan === p.bulan);
  return cariAtauJumlahkan(barisBulan, wilayahKerja, [...KOLOM_ANGKA_COP]);
}

async function ambilPhqcMingguan(
  p: PeriodeMingguan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanMingguan('phqc', p.tahun);
  const barisMinggu = baris.filter((b) => b.minggu_epid === p.minggu);
  return cariAtauJumlahkan(barisMinggu, wilayahKerja, [...KOLOM_ANGKA_PHQC]);
}

async function ambilPhqcBulanan(
  p: PeriodeBulanan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanBulanan('phqc', p.tahun);
  const barisBulan = baris.filter((b) => b.bulan === p.bulan);
  return cariAtauJumlahkan(barisBulan, wilayahKerja, [...KOLOM_ANGKA_PHQC]);
}

async function ambilPenumpangMingguan(
  p: PeriodeMingguan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanMingguan('phqc', p.tahun);
  const barisMinggu = baris.filter((b) => b.minggu_epid === p.minggu);
  return cariAtauJumlahkan(barisMinggu, wilayahKerja, [...KOLOM_ANGKA_PENUMPANG]);
}

async function ambilPenumpangBulanan(
  p: PeriodeBulanan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanBulanan('phqc', p.tahun);
  const barisBulan = baris.filter((b) => b.bulan === p.bulan);
  return cariAtauJumlahkan(barisBulan, wilayahKerja, [...KOLOM_ANGKA_PENUMPANG]);
}

function gabungkanRingkasan(
  a: Record<string, number>,
  b: Record<string, number>,
  prefixA: string,
  prefixB: string
): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const [k, v] of Object.entries(a)) hasil[`${prefixA}_${k}`] = v;
  for (const [k, v] of Object.entries(b)) hasil[`${prefixB}_${k}`] = v;
  return hasil;
}

async function topKategoriUmum(
  tabel: 'cop' | 'phqc',
  periode: 'mingguan' | 'bulanan',
  filterPeriode: { tahun_epid: number; minggu_epid: number } | { tahun: number; bulan: number },
  wilayahKerja: string | undefined
): Promise<{ kategori: string; nilai: string; jumlah: number }[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baris = await (getKategoriBreakdown as any)(tabel, periode, {
    ...filterPeriode,
    ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
  });

  return (baris as { kategori: string; nilai: string; jumlah: number }[])
    .filter((b) => b.nilai !== 'Tidak Diisi')
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 8);
}

/**
 * Titik masuk utama -- dipanggil dari Route Handler
 * (app/api/analisis-ai/route.ts). wilayahKerja generik string:
 *   - COP/PHQC : nilai enum Wilayah ("Samarinda", dst.)
 *   - Vektor   : kode_wilker ("WK01", dst.)
 * metrik HANYA relevan untuk konteks vektor.
 */
export async function ambilDataAnalisis(
  konteks: KonteksAnalisis,
  periodeKey: string,
  wilayahKerja: string | undefined,
  metrik?: MetrikVektor
): Promise<DataAnalisis> {
  if (konteks === 'vektor-dbd-mingguan' || konteks === 'vektor-dbd-bulanan') {
    return ambilDataAnalisisVektorDbd(periodeKey, wilayahKerja, metrik);
  }

  const labelWilayah = wilayahKerja ?? 'Seluruh wilayah kerja BKK Kelas I Samarinda';

  if (konteks === 'penumpang-mingguan' || konteks === 'penumpang-bulanan') {
    if (konteks === 'penumpang-mingguan') {
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilPenumpangMingguan(periodeSaatIni, wilayahKerja),
        ambilPenumpangMingguan(periodeSebelumnya, wilayahKerja),
      ]);
      return {
        labelKonteks: 'Volume Penumpang PHQC (tiba/berangkat) — Mingguan',
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilPenumpangBulanan(periodeSaatIni, wilayahKerja),
      ambilPenumpangBulanan(periodeSebelumnya, wilayahKerja),
    ]);
    return {
      labelKonteks: 'Volume Penumpang PHQC (tiba/berangkat) — Bulanan',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  if (konteks === 'global-emerging-mingguan' || konteks === 'global-emerging-bulanan') {
    if (konteks === 'global-emerging-mingguan') {
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilRingkasanGlobalEmergingMingguan(periodeSaatIni),
        ambilRingkasanGlobalEmergingMingguan(periodeSebelumnya),
      ]);
      return {
        labelKonteks: 'Penyakit Infeksi Emerging (13 negara asal kapal)',
        labelWilayah: 'Seluruh negara fokus (Global Emerging)',
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: ringkasEmerging(saatIni),
        ringkasanSebelumnya: ringkasEmerging(sebelumnya),
        topKategori: topKategoriEmerging(saatIni),
      };
    }

    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilRingkasanGlobalEmergingBulanan(periodeSaatIni),
      ambilRingkasanGlobalEmergingBulanan(periodeSebelumnya),
    ]);
    return {
      labelKonteks: 'Penyakit Infeksi Emerging (13 negara asal kapal)',
      labelWilayah: 'Seluruh negara fokus (Global Emerging)',
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: ringkasEmerging(saatIni),
      ringkasanSebelumnya: ringkasEmerging(sebelumnya),
      topKategori: topKategoriEmerging(saatIni),
    };
  }

  if (
    konteks === 'dashboard-utama' ||
    konteks === 'alat-angkut-ringkasan' ||
    konteks === 'cop-mingguan' ||
    konteks === 'phqc-mingguan'
  ) {
    const periodeSaatIni = parsePeriodeMingguan(periodeKey);
    const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);

    if (konteks === 'cop-mingguan') {
      const [saatIni, sebelumnya, topKategori] = await Promise.all([
        ambilCopMingguan(periodeSaatIni, wilayahKerja),
        ambilCopMingguan(periodeSebelumnya, wilayahKerja),
        topKategoriUmum(
          'cop', 'mingguan',
          { tahun_epid: periodeSaatIni.tahun, minggu_epid: periodeSaatIni.minggu },
          wilayahKerja
        ),
      ]);
      return {
        labelKonteks: 'Kegiatan COP (Certificate of Pratique)',
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori,
      };
    }

    if (konteks === 'phqc-mingguan') {
      const [saatIni, sebelumnya, topKategori] = await Promise.all([
        ambilPhqcMingguan(periodeSaatIni, wilayahKerja),
        ambilPhqcMingguan(periodeSebelumnya, wilayahKerja),
        topKategoriUmum(
          'phqc', 'mingguan',
          { tahun_epid: periodeSaatIni.tahun, minggu_epid: periodeSaatIni.minggu },
          wilayahKerja
        ),
      ]);
      return {
        labelKonteks: 'Kegiatan PHQC (Port Health Quarantine Clearance)',
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori,
      };
    }

    const [copSaatIni, copSebelumnya, phqcSaatIni, phqcSebelumnya, topKategoriCop, topKategoriPhqc] =
      await Promise.all([
        ambilCopMingguan(periodeSaatIni, wilayahKerja),
        ambilCopMingguan(periodeSebelumnya, wilayahKerja),
        ambilPhqcMingguan(periodeSaatIni, wilayahKerja),
        ambilPhqcMingguan(periodeSebelumnya, wilayahKerja),
        topKategoriUmum(
          'cop', 'mingguan',
          { tahun_epid: periodeSaatIni.tahun, minggu_epid: periodeSaatIni.minggu },
          wilayahKerja
        ),
        topKategoriUmum(
          'phqc', 'mingguan',
          { tahun_epid: periodeSaatIni.tahun, minggu_epid: periodeSaatIni.minggu },
          wilayahKerja
        ),
      ]);

    return {
      labelKonteks:
        konteks === 'alat-angkut-ringkasan'
          ? 'Alat Angkut Kapal (rekap COP + PHQC)'
          : 'Dashboard utama (rekap COP + PHQC)',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
      ringkasanSaatIni: gabungkanRingkasan(copSaatIni, phqcSaatIni, 'cop', 'phqc'),
      ringkasanSebelumnya: gabungkanRingkasan(copSebelumnya, phqcSebelumnya, 'cop', 'phqc'),
      topKategori: [...topKategoriCop, ...topKategoriPhqc]
        .sort((a, b) => b.jumlah - a.jumlah)
        .slice(0, 8),
    };
  }

  const periodeSaatIni = parsePeriodeBulanan(periodeKey);
  const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
  const tabel = konteks === 'cop-bulanan' ? 'cop' : 'phqc';

  const [saatIni, sebelumnya, topKategori] = await Promise.all([
    tabel === 'cop' ? ambilCopBulanan(periodeSaatIni, wilayahKerja) : ambilPhqcBulanan(periodeSaatIni, wilayahKerja),
    tabel === 'cop'
      ? ambilCopBulanan(periodeSebelumnya, wilayahKerja)
      : ambilPhqcBulanan(periodeSebelumnya, wilayahKerja),
    topKategoriUmum(
      tabel, 'bulanan',
      { tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan },
      wilayahKerja
    ),
  ]);

  return {
    labelKonteks:
      tabel === 'cop'
        ? 'Kegiatan COP (Certificate of Pratique)'
        : 'Kegiatan PHQC (Port Health Quarantine Clearance)',
    labelWilayah,
    labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
    labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
    ringkasanSaatIni: saatIni,
    ringkasanSebelumnya: sebelumnya,
    topKategori,
  };
}

export type DataBreakdownAnalisis = {
  labelKonteks: string;
  labelWilayah: string;
  labelPeriode: string;
  totalKapal: number;
  breakdown: { nilai: string; jumlah: number }[];
};

/**
 * Kategori kolom per konteks breakdown. Untuk cop-*, nilainya divalidasi
 * lewat `satisfies KategoriCop`. Untuk phqc-*, tipe kategori aslinya
 * KategoriPhqc (bendera | rba | tujuan_berlayar | pelabuhan_kedatangan |
 * pelabuhan_tujuan) -- TIDAK ADA kolom "negara_asal" terpisah di skema.
 * "Daerah asal" untuk PHQC direpresentasikan lewat pelabuhan_kedatangan
 * (dikonfirmasi user). phqc-pelabuhan-* ditangani terpisah lewat
 * ambilDataBreakdownPelabuhanPhqc() karena menggabungkan DUA kategori
 * (kedatangan + tujuan) sekaligus, jadi baris di bawah untuk kedua
 * konteks itu cuma placeholder (tidak dipakai).
 */
const KATEGORI_PER_KONTEKS_BREAKDOWN: Record<KonteksBreakdown, string> = {
  'cop-rba': 'rba' satisfies KategoriCop,
  'cop-negara-asal': 'negara_kedatangan' satisfies KategoriCop,
  'cop-faktor-risiko': 'faktor_risiko' satisfies KategoriCop,
  'phqc-daerah-asal': 'pelabuhan_kedatangan',
  'phqc-rba-mingguan': 'rba',
  'phqc-rba-bulanan': 'rba',
  'phqc-pelabuhan-mingguan': 'pelabuhan_kedatangan', // placeholder, lihat catatan di atas
  'phqc-pelabuhan-bulanan': 'pelabuhan_kedatangan', // placeholder, lihat catatan di atas
};

/** Tabel sumber data per konteks breakdown -- cop-* dari tabel cop, phqc-* dari tabel phqc. */
const TABEL_PER_KONTEKS_BREAKDOWN: Record<KonteksBreakdown, 'cop' | 'phqc'> = {
  'cop-rba': 'cop',
  'cop-negara-asal': 'cop',
  'cop-faktor-risiko': 'cop',
  'phqc-daerah-asal': 'phqc',
  'phqc-rba-mingguan': 'phqc',
  'phqc-rba-bulanan': 'phqc',
  'phqc-pelabuhan-mingguan': 'phqc',
  'phqc-pelabuhan-bulanan': 'phqc',
};

const LABEL_PER_KONTEKS_BREAKDOWN: Record<KonteksBreakdown, string> = {
  'cop-rba': 'Klasifikasi Risiko (RBA) Kegiatan COP',
  'cop-negara-asal': 'Negara Kedatangan Kapal (Kegiatan COP)',
  'cop-faktor-risiko': 'Faktor Risiko Kegiatan COP',
  'phqc-daerah-asal': 'Daerah Asal — Pelabuhan Kedatangan (Kegiatan PHQC)',
  'phqc-rba-mingguan': 'Klasifikasi Risiko (RBA) Kegiatan PHQC — Mingguan',
  'phqc-rba-bulanan': 'Klasifikasi Risiko (RBA) Kegiatan PHQC — Bulanan',
  'phqc-pelabuhan-mingguan': 'Pelabuhan Kedatangan & Tujuan (Kegiatan PHQC) — Mingguan',
  'phqc-pelabuhan-bulanan': 'Pelabuhan Kedatangan & Tujuan (Kegiatan PHQC) — Bulanan',
};

/**
 * Breakdown gabungan pelabuhan_kedatangan + pelabuhan_tujuan untuk SATU
 * periode (paralel dengan grafik tren tahunan di UI, tapi ini snapshot
 * satu periode saja, dipakai tombol Analisis AI). Nilai diberi prefiks
 * "Kedatangan: "/"Tujuan: " supaya kedua kategori tetap bisa dibedakan
 * setelah digabung dalam satu daftar breakdown.
 */
async function ambilDataBreakdownPelabuhanPhqc(
  periodeKey: string,
  wilayahKerja: string | undefined
): Promise<DataBreakdownAnalisis> {
  const labelWilayah = wilayahKerja ?? 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);

  let labelPeriode: string;
  let barisKedatangan: { kategori: string; nilai: string; jumlah: number }[];
  let barisTujuan: { kategori: string; nilai: string; jumlah: number }[];
  let totalKapal: number;

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);
    labelPeriode = labelPeriodeMingguan(p);
    [barisKedatangan, barisTujuan] = await Promise.all([
      (getKategoriBreakdown as any)('phqc', 'mingguan', {
        tahun_epid: p.tahun,
        minggu_epid: p.minggu,
        kategori: 'pelabuhan_kedatangan',
        ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
      }),
      (getKategoriBreakdown as any)('phqc', 'mingguan', {
        tahun_epid: p.tahun,
        minggu_epid: p.minggu,
        kategori: 'pelabuhan_tujuan',
        ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
      }),
    ]);
    const ringkasan = await ambilPhqcMingguan(p, wilayahKerja);
    totalKapal = ringkasan.jumlah_kapal ?? 0;
  } else {
    const p = parsePeriodeBulanan(periodeKey);
    labelPeriode = labelPeriodeBulanan(p);
    [barisKedatangan, barisTujuan] = await Promise.all([
      (getKategoriBreakdown as any)('phqc', 'bulanan', {
        tahun: p.tahun,
        bulan: p.bulan,
        kategori: 'pelabuhan_kedatangan',
        ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
      }),
      (getKategoriBreakdown as any)('phqc', 'bulanan', {
        tahun: p.tahun,
        bulan: p.bulan,
        kategori: 'pelabuhan_tujuan',
        ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
      }),
    ]);
    const ringkasan = await ambilPhqcBulanan(p, wilayahKerja);
    totalKapal = ringkasan.jumlah_kapal ?? 0;
  }

  const peta = new Map<string, number>();
  barisKedatangan.forEach((b) =>
    peta.set(`Kedatangan: ${b.nilai}`, (peta.get(`Kedatangan: ${b.nilai}`) ?? 0) + b.jumlah)
  );
  barisTujuan.forEach((b) =>
    peta.set(`Tujuan: ${b.nilai}`, (peta.get(`Tujuan: ${b.nilai}`) ?? 0) + b.jumlah)
  );
  const breakdown = Array.from(peta.entries())
    .map(([nilai, jumlah]) => ({ nilai, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return {
    labelKonteks: LABEL_PER_KONTEKS_BREAKDOWN[isMingguan ? 'phqc-pelabuhan-mingguan' : 'phqc-pelabuhan-bulanan'],
    labelWilayah,
    labelPeriode,
    totalKapal,
    breakdown,
  };
}

export async function ambilDataBreakdownAnalisis(
  konteks: KonteksBreakdown,
  periodeKey: string,
  wilayahKerja: string | undefined
): Promise<DataBreakdownAnalisis> {
  if (konteks === 'phqc-pelabuhan-mingguan' || konteks === 'phqc-pelabuhan-bulanan') {
    return ambilDataBreakdownPelabuhanPhqc(periodeKey, wilayahKerja);
  }

  const labelWilayah = wilayahKerja ?? 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const kategori = KATEGORI_PER_KONTEKS_BREAKDOWN[konteks];
  const tabel = TABEL_PER_KONTEKS_BREAKDOWN[konteks];
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);

  let labelPeriode: string;
  let baris: { kategori: string; nilai: string; jumlah: number }[];
  let totalKapal: number;

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);
    labelPeriode = labelPeriodeMingguan(p);
    baris = await (getKategoriBreakdown as any)(tabel, 'mingguan', {
      tahun_epid: p.tahun,
      minggu_epid: p.minggu,
      kategori,
      ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
    });
    const ringkasan =
      tabel === 'cop' ? await ambilCopMingguan(p, wilayahKerja) : await ambilPhqcMingguan(p, wilayahKerja);
    totalKapal = ringkasan.jumlah_kapal ?? 0;
  } else {
    const p = parsePeriodeBulanan(periodeKey);
    labelPeriode = labelPeriodeBulanan(p);
    baris = await (getKategoriBreakdown as any)(tabel, 'bulanan', {
      tahun: p.tahun,
      bulan: p.bulan,
      kategori,
      ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
    });
    const ringkasan =
      tabel === 'cop' ? await ambilCopBulanan(p, wilayahKerja) : await ambilPhqcBulanan(p, wilayahKerja);
    totalKapal = ringkasan.jumlah_kapal ?? 0;
  }

  const peta = new Map<string, number>();
  baris.forEach((b) => peta.set(b.nilai, (peta.get(b.nilai) ?? 0) + b.jumlah));
  const breakdown = Array.from(peta.entries())
    .map(([nilai, jumlah]) => ({ nilai, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return {
    labelKonteks: LABEL_PER_KONTEKS_BREAKDOWN[konteks],
    labelWilayah,
    labelPeriode,
    totalKapal,
    breakdown,
  };
}