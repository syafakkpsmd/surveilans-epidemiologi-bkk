import {
  getRingkasanMingguan,
  getRingkasanBulanan,
  getKategoriBreakdown,
  getRingkasanVektorTikus,
  getRingkasanVektorTikusBulanan,
  getUjiLabVektorTikusMingguan,
  getUjiLabVektorTikusBulanan,
  getTrenAnophelesDewasa,
  getTrenLarva,
  getRingkasanTppBulanan,
  getRingkasanTtuBulanan,
  getRingkasanPabBulanan,
  getRingkasanTppMingguan,
  getRingkasanTtuMingguan,
  getRingkasanPabMingguan,
  getRingkasanRatGuardMingguan,   // <-- tambahkan
  getRingkasanRatGuardBulanan,
} from '@/lib/supabase/queries';
import { getTrenDiareMultiVariabel, getTrenDiareBulanan } from '@/lib/supabase/queriesVektorDiareEnhanced';
import type { KategoriCop } from '@/types/database.types';
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
  type PeriodeMingguan,
  type PeriodeBulanan,
} from './periode';
import { ambilDataAnalisisVektorDbdRentang, type MetrikVektor } from './dataVektor';

export const KONTEKS_TREN = [
  'dashboard-utama',
  'alat-angkut-ringkasan',
  'cop-mingguan',
  'cop-bulanan',
  'phqc-mingguan',
  'phqc-bulanan',
  'cop-negara-tren', 
  'penumpang-mingguan',
  'penumpang-bulanan',
  'pesawat-mingguan',
  'pesawat-bulanan',
  'vektor-dbd-mingguan',
  'vektor-dbd-bulanan',
  'tikus-lab-mingguan',
  'tikus-lab-bulanan',
  'vektor-tikus-mingguan',
  'vektor-tikus-bulanan',
  'vektor-diare-lalat-mingguan',
  'vektor-diare-kecoa-mingguan',
  'vektor-diare-lalat-bulanan',
  'vektor-diare-kecoa-bulanan',
  'anopheles-dewasa-mingguan',
  'anopheles-dewasa-bulanan',
  'anopheles-larva-mingguan',
  'anopheles-larva-bulanan',
  'tpp-bulanan',
  'ttu-bulanan',
  'pab-bulanan',
  'tpp-mingguan',
  'ttu-mingguan',
  'pab-mingguan',
  'rat-guard-mingguan',
  'rat-guard-bulanan',
] as const;

export const KONTEKS_BREAKDOWN = [
  'cop-rba',
  'cop-negara-asal',
  'cop-faktor-risiko',
  'cop-per-wilker', 
  'phqc-daerah-asal',
  'phqc-rba-mingguan',
  'phqc-rba-bulanan',
  'phqc-pelabuhan-mingguan',
  'phqc-pelabuhan-bulanan',
] as const;

export const KONTEKS_PREDIKSI_NON_VEKTOR = [
  'cop-rba',
  'cop-negara-asal',
  'cop-negara-tren',        
  'cop-per-wilker', 
  'phqc-daerah-asal',
  'phqc-rba-mingguan',
  'phqc-rba-bulanan',
  'penumpang-mingguan',
  'penumpang-bulanan',
  'pesawat-mingguan',
  'pesawat-bulanan',
  'tikus-lab-mingguan',
  'tikus-lab-bulanan',
  'vektor-tikus-mingguan',
  'vektor-tikus-bulanan',
  'vektor-diare-lalat-mingguan',
  'vektor-diare-kecoa-mingguan',
  'vektor-diare-lalat-bulanan',
  'vektor-diare-kecoa-bulanan',
  'anopheles-dewasa-mingguan',
  'anopheles-dewasa-bulanan',
  'anopheles-larva-mingguan',
  'anopheles-larva-bulanan',
  'tpp-bulanan',
  'ttu-bulanan',
  'pab-bulanan',
  'tpp-mingguan',
  'ttu-mingguan',
  'pab-mingguan',
  'rat-guard-mingguan',
  'rat-guard-bulanan',
] as const;

export const KONTEKS_VALID = [...KONTEKS_TREN, ...KONTEKS_BREAKDOWN] as const;

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
  return konteks === 'vektor-dbd-mingguan' || konteks === 'vektor-dbd-bulanan';
}

export function isKonteksKodeWilkerOpsional(konteks: KonteksAnalisis): boolean {
  return (
    konteks === 'pesawat-mingguan' ||
    konteks === 'pesawat-bulanan' ||
    konteks === 'tikus-lab-mingguan' ||
    konteks === 'tikus-lab-bulanan' ||
    konteks === 'vektor-tikus-mingguan' ||   
    konteks === 'vektor-tikus-bulanan' ||
    konteks === 'vektor-diare-lalat-mingguan' ||
    konteks === 'vektor-diare-kecoa-mingguan' ||
    konteks === 'vektor-diare-lalat-bulanan' ||
    konteks === 'vektor-diare-kecoa-bulanan' ||
    konteks.startsWith('anopheles-')
  );
}

export function isKonteksSanitasi(konteks: KonteksAnalisis): boolean {
  return (
    konteks === 'tpp-bulanan' || konteks === 'ttu-bulanan' || konteks === 'pab-bulanan' ||
    konteks === 'tpp-mingguan' || konteks === 'ttu-mingguan' || konteks === 'pab-mingguan' ||
    konteks === 'rat-guard-bulanan' || konteks === 'rat-guard-mingguan'
  );
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

/**
 * Sama seperti cariAtauJumlahkan, tapi untuk RENTANG banyak baris
 * sekaligus (dipakai untuk analisis KUMULATIF TPP/TTU/PAB: minggu 1..N
 * atau bulan 1..N) -- filter dulu berdasar wilayah kerja (kalau ada),
 * lalu JUMLAHKAN SEMUA baris yang cocok. Beda dari cariAtauJumlahkan
 * yang untuk kasus wilayah spesifik hanya mengambil SATU baris (satu
 * periode), fungsi ini memang didesain untuk banyak baris/periode
 * sekaligus per wilayah yang sama.
 */
function jumlahkanRentang<T extends Record<string, unknown>>(
  baris: T[],
  wilayahKerja: string | undefined,
  kolomAngka: (keyof T)[]
): Record<string, number> {
  const terfilter = wilayahKerja ? baris.filter((b) => b.wilayah_kerja === wilayahKerja) : baris;
  return jumlahkanRingkasan(terfilter, kolomAngka);
}

const KOLOM_ANGKA_COP = ['jumlah_kapal', 'total_abk', 'total_abk_wna', 'total_abk_wni'] as const;
const KOLOM_ANGKA_PHQC = [
  'jumlah_kapal', 'total_abk', 'total_abk_wna', 'total_abk_wni',
  'total_penumpang', 'total_penumpang_wna', 'total_penumpang_wni',
] as const;
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

async function ambilCopKumulatifMingguan(
  tahun: number,
  mingguAkhir: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanMingguan('cop', tahun);
  const barisRentang = baris.filter((b) => b.minggu_epid >= 1 && b.minggu_epid <= mingguAkhir);
  return jumlahkanRentang(barisRentang, wilayahKerja, [...KOLOM_ANGKA_COP]);
}

async function ambilCopKumulatifBulanan(
  tahun: number,
  bulanAkhir: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const baris = await getRingkasanBulanan('cop', tahun);
  const barisRentang = baris.filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
  return jumlahkanRentang(barisRentang, wilayahKerja, [...KOLOM_ANGKA_COP]);
}

/**
 * Titik masuk KHUSUS untuk cop-mingguan/cop-bulanan (Section 5 "Tren
 * Gabungan" di app/cop/page.tsx) -- pola sama persis dengan
 * ambilDataAnalisisSanitasi() untuk TPP/TTU/PAB.
 */
export async function ambilDataAnalisisCop(
  konteks: 'cop-mingguan' | 'cop-bulanan',
  periodeKey: string,
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';

  if (konteks === 'cop-mingguan') {
    const periodeSaatIni = parsePeriodeMingguan(periodeKey);

    if (tipe === 'prediksi') {
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
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

    const [saatIni, sebelumnya] = await Promise.all([
      ambilCopKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu, wilayahKerja),
      ambilCopKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu - 1, wilayahKerja),
    ]);
    return {
      labelKonteks: 'Kegiatan COP (Certificate of Pratique)',
      labelWilayah,
      labelPeriodeSaatIni: `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu} tahun ${periodeSaatIni.tahun} (kumulatif)`,
      labelPeriodeSebelumnya:
        periodeSaatIni.minggu > 1
          ? `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu - 1} tahun ${periodeSaatIni.tahun} (kumulatif)`
          : 'Belum ada data sebelum minggu epidemiologi ke-1',
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  // cop-bulanan
  const periodeSaatIni = parsePeriodeBulanan(periodeKey);

  if (tipe === 'prediksi') {
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya, topKategori] = await Promise.all([
      ambilCopBulanan(periodeSaatIni, wilayahKerja),
      ambilCopBulanan(periodeSebelumnya, wilayahKerja),
      topKategoriUmum(
        'cop', 'bulanan',
        { tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan },
        wilayahKerja
      ),
    ]);
    return {
      labelKonteks: 'Kegiatan COP (Certificate of Pratique)',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori,
    };
  }

  const [saatIni, sebelumnya] = await Promise.all([
    ambilCopKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan, wilayahKerja),
    ambilCopKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan - 1, wilayahKerja),
  ]);
  return {
    labelKonteks: 'Kegiatan COP (Certificate of Pratique)',
    labelWilayah,
    labelPeriodeSaatIni: `Januari s.d. ${labelPeriodeBulanan(periodeSaatIni)} (kumulatif)`,
    labelPeriodeSebelumnya:
      periodeSaatIni.bulan > 1
        ? `Januari s.d. ${labelPeriodeBulanan({ jenis: 'bulanan', tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan - 1 })} (kumulatif)`
        : 'Belum ada data sebelum Januari',
    ringkasanSaatIni: saatIni,
    ringkasanSebelumnya: sebelumnya,
    topKategori: [],
  };
}

const KOLOM_ANGKA_RATGUARD = ['jumlah_kapal', 'pasang', 'tidak_pasang'] as const;
// CATATAN: persentase_kepatuhan SENGAJA tidak dimasukkan ke sini — kalau ikut disum
// mentah (via jumlahkanRingkasan/jumlahkanRentang) hasilnya salah waktu ada >1 wilayah
// kerja (mis. 60% + 90% = 150%). Dihitung ulang manual setelah agregasi, lihat
// tambahkanPersentaseKepatuhan() di bawah.

function tambahkanPersentaseKepatuhan(ringkasan: Record<string, number>): Record<string, number> {
  const jumlahKapal = ringkasan.jumlah_kapal ?? 0;
  const pasang = ringkasan.pasang ?? 0;
  return {
    ...ringkasan,
    persentase_kepatuhan: jumlahKapal > 0 ? Math.round((pasang / jumlahKapal) * 1000) / 10 : 0,
  };
}

async function ambilRatGuardMingguan(p: PeriodeMingguan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanRatGuardMingguan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.minggu === p.minggu);
  return tambahkanPersentaseKepatuhan(cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_RATGUARD as any));
}

async function ambilRatGuardBulanan(p: PeriodeBulanan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanRatGuardBulanan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.bulan === p.bulan);
  return tambahkanPersentaseKepatuhan(cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_RATGUARD as any));
}

async function ambilRatGuardKumulatifMingguan(tahun: number, mingguAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanRatGuardMingguan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.minggu) >= 1 && Number(r.minggu) <= mingguAkhir);
  return tambahkanPersentaseKepatuhan(jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_RATGUARD as any));
}

async function ambilRatGuardKumulatifBulanan(tahun: number, bulanAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanRatGuardBulanan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.bulan) >= 1 && Number(r.bulan) <= bulanAkhir);
  return tambahkanPersentaseKepatuhan(jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_RATGUARD as any));
}

export async function ambilDataAnalisisRatGuard(
  konteks: 'rat-guard-mingguan' | 'rat-guard-bulanan',
  periodeKey: string,
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const labelModul = 'Pengawasan Rat Guard';
  const isMingguan = konteks === 'rat-guard-mingguan';

  if (tipe === 'prediksi') {
    if (isMingguan) {
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilRatGuardMingguan(periodeSaatIni, wilayahKerja),
        ambilRatGuardMingguan(periodeSebelumnya, wilayahKerja),
      ]);
      return {
        labelKonteks: labelModul,
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
      ambilRatGuardBulanan(periodeSaatIni, wilayahKerja),
      ambilRatGuardBulanan(periodeSebelumnya, wilayahKerja),
    ]);
    return {
      labelKonteks: labelModul,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  if (isMingguan) {
    const periodeSaatIni = parsePeriodeMingguan(periodeKey);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilRatGuardKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu, wilayahKerja),
      ambilRatGuardKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu - 1, wilayahKerja),
    ]);
    return {
      labelKonteks: labelModul,
      labelWilayah,
      labelPeriodeSaatIni: `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu} tahun ${periodeSaatIni.tahun} (kumulatif)`,
      labelPeriodeSebelumnya:
        periodeSaatIni.minggu > 1
          ? `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu - 1} tahun ${periodeSaatIni.tahun} (kumulatif)`
          : 'Belum ada data sebelum minggu epidemiologi ke-1',
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  const periodeSaatIni = parsePeriodeBulanan(periodeKey);
  const [saatIni, sebelumnya] = await Promise.all([
    ambilRatGuardKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan, wilayahKerja),
    ambilRatGuardKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan - 1, wilayahKerja),
  ]);

  return {
    labelKonteks: labelModul,
    labelWilayah,
    labelPeriodeSaatIni: `Januari s.d. ${labelPeriodeBulanan(periodeSaatIni)} (kumulatif)`,
    labelPeriodeSebelumnya:
      periodeSaatIni.bulan > 1
        ? `Januari s.d. ${labelPeriodeBulanan({ jenis: 'bulanan', tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan - 1 })} (kumulatif)`
        : 'Belum ada data sebelum Januari',
    ringkasanSaatIni: saatIni,
    ringkasanSebelumnya: sebelumnya,
    topKategori: [],
  };
}

async function ambilPhqcMingguan(p: PeriodeMingguan, wilayahKerja: string | undefined) {
  const baris = await getRingkasanMingguan('phqc', p.tahun);
  const barisMinggu = baris.filter((b) => b.minggu_epid === p.minggu);
  return cariAtauJumlahkan(barisMinggu, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PHQC]);
}

async function ambilPhqcBulanan(p: PeriodeBulanan, wilayahKerja: string | undefined) {
  const baris = await getRingkasanBulanan('phqc', p.tahun);
  const barisBulan = baris.filter((b) => b.bulan === p.bulan);
  return cariAtauJumlahkan(barisBulan, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PHQC]);
}

async function ambilPenumpangMingguan(p: PeriodeMingguan, wilayahKerja: string | undefined) {
  const baris = await getRingkasanMingguan('phqc', p.tahun);
  const barisMinggu = baris.filter((b) => b.minggu_epid === p.minggu);
  return cariAtauJumlahkan(barisMinggu, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PENUMPANG]);
}

async function ambilPenumpangBulanan(p: PeriodeBulanan, wilayahKerja: string | undefined) {
  const baris = await getRingkasanBulanan('phqc', p.tahun);
  const barisBulan = baris.filter((b) => b.bulan === p.bulan);
  return cariAtauJumlahkan(barisBulan, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PENUMPANG]);
}

async function ambilPhqcKumulatifMingguan(tahun: number, mingguAkhir: number, wilayahKerja: string | undefined) {
  const baris = await getRingkasanMingguan('phqc', tahun);
  const barisRentang = baris.filter((b) => b.minggu_epid >= 1 && b.minggu_epid <= mingguAkhir);
  return jumlahkanRentang(barisRentang, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PHQC]);
}

async function ambilPhqcKumulatifBulanan(tahun: number, bulanAkhir: number, wilayahKerja: string | undefined) {
  const baris = await getRingkasanBulanan('phqc', tahun);
  const barisRentang = baris.filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
  return jumlahkanRentang(barisRentang, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PHQC]);
}

async function ambilPenumpangKumulatifMingguan(tahun: number, mingguAkhir: number, wilayahKerja: string | undefined) {
  const baris = await getRingkasanMingguan('phqc', tahun);
  const barisRentang = baris.filter((b) => b.minggu_epid >= 1 && b.minggu_epid <= mingguAkhir);
  return jumlahkanRentang(barisRentang, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PENUMPANG]);
}

async function ambilPenumpangKumulatifBulanan(tahun: number, bulanAkhir: number, wilayahKerja: string | undefined) {
  const baris = await getRingkasanBulanan('phqc', tahun);
  const barisRentang = baris.filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
  return jumlahkanRentang(barisRentang, resolveWilayahPhqcDb(wilayahKerja), [...KOLOM_ANGKA_PENUMPANG]);
}

/**
 * Titik masuk KHUSUS untuk phqc-mingguan/phqc-bulanan (Section "Tren
 * Utama" di app/phqc/page.tsx) -- pola sama persis dengan
 * ambilDataAnalisisCop() untuk COP.
 */
export async function ambilDataAnalisisPhqc(
  konteks: 'phqc-mingguan' | 'phqc-bulanan',
  periodeKey: string,
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';

  if (konteks === 'phqc-mingguan') {
    const periodeSaatIni = parsePeriodeMingguan(periodeKey);

    if (tipe === 'prediksi') {
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
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

    const [saatIni, sebelumnya] = await Promise.all([
      ambilPhqcKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu, wilayahKerja),
      ambilPhqcKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu - 1, wilayahKerja),
    ]);
    return {
      labelKonteks: 'Kegiatan PHQC (Port Health Quarantine Clearance)',
      labelWilayah,
      labelPeriodeSaatIni: `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu} tahun ${periodeSaatIni.tahun} (kumulatif)`,
      labelPeriodeSebelumnya:
        periodeSaatIni.minggu > 1
          ? `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu - 1} tahun ${periodeSaatIni.tahun} (kumulatif)`
          : 'Belum ada data sebelum minggu epidemiologi ke-1',
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  // phqc-bulanan
  const periodeSaatIni = parsePeriodeBulanan(periodeKey);

  if (tipe === 'prediksi') {
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya, topKategori] = await Promise.all([
      ambilPhqcBulanan(periodeSaatIni, wilayahKerja),
      ambilPhqcBulanan(periodeSebelumnya, wilayahKerja),
      topKategoriUmum(
        'phqc', 'bulanan',
        { tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan },
        wilayahKerja
      ),
    ]);
    return {
      labelKonteks: 'Kegiatan PHQC (Port Health Quarantine Clearance)',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori,
    };
  }

  const [saatIni, sebelumnya] = await Promise.all([
    ambilPhqcKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan, wilayahKerja),
    ambilPhqcKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan - 1, wilayahKerja),
  ]);
  return {
    labelKonteks: 'Kegiatan PHQC (Port Health Quarantine Clearance)',
    labelWilayah,
    labelPeriodeSaatIni: `Januari s.d. ${labelPeriodeBulanan(periodeSaatIni)} (kumulatif)`,
    labelPeriodeSebelumnya:
      periodeSaatIni.bulan > 1
        ? `Januari s.d. ${labelPeriodeBulanan({ jenis: 'bulanan', tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan - 1 })} (kumulatif)`
        : 'Belum ada data sebelum Januari',
    ringkasanSaatIni: saatIni,
    ringkasanSebelumnya: sebelumnya,
    topKategori: [],
  };
}

/**
 * Titik masuk KHUSUS untuk penumpang-mingguan/penumpang-bulanan
 * (Section "Crew & Penumpang Tren" di app/phqc/page.tsx).
 */
export async function ambilDataAnalisisPenumpang(
  konteks: 'penumpang-mingguan' | 'penumpang-bulanan',
  periodeKey: string,
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';

  if (konteks === 'penumpang-mingguan') {
    const periodeSaatIni = parsePeriodeMingguan(periodeKey);

    if (tipe === 'prediksi') {
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

    const [saatIni, sebelumnya] = await Promise.all([
      ambilPenumpangKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu, wilayahKerja),
      ambilPenumpangKumulatifMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu - 1, wilayahKerja),
    ]);
    return {
      labelKonteks: 'Volume Penumpang PHQC (tiba/berangkat) — Mingguan',
      labelWilayah,
      labelPeriodeSaatIni: `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu} tahun ${periodeSaatIni.tahun} (kumulatif)`,
      labelPeriodeSebelumnya:
        periodeSaatIni.minggu > 1
          ? `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu - 1} tahun ${periodeSaatIni.tahun} (kumulatif)`
          : 'Belum ada data sebelum minggu epidemiologi ke-1',
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  // penumpang-bulanan
  const periodeSaatIni = parsePeriodeBulanan(periodeKey);

  if (tipe === 'prediksi') {
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

  const [saatIni, sebelumnya] = await Promise.all([
    ambilPenumpangKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan, wilayahKerja),
    ambilPenumpangKumulatifBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan - 1, wilayahKerja),
  ]);
  return {
    labelKonteks: 'Volume Penumpang PHQC (tiba/berangkat) — Bulanan',
    labelWilayah,
    labelPeriodeSaatIni: `Januari s.d. ${labelPeriodeBulanan(periodeSaatIni)} (kumulatif)`,
    labelPeriodeSebelumnya:
      periodeSaatIni.bulan > 1
        ? `Januari s.d. ${labelPeriodeBulanan({ jenis: 'bulanan', tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan - 1 })} (kumulatif)`
        : 'Belum ada data sebelum Januari',
    ringkasanSaatIni: saatIni,
    ringkasanSebelumnya: sebelumnya,
    topKategori: [],
  };
}


async function ambilTikusLabMingguan(
  p: PeriodeMingguan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const [ringkasan, ujiLab] = await Promise.all([
    getRingkasanVektorTikus(p.tahun, wilayahKerja),
    getUjiLabVektorTikusMingguan(p.tahun, wilayahKerja),
  ]);

  const barisMinggu = (ringkasan as any[]).filter((r) => r.minggu_epid === p.minggu);
  const ujiLabMinggu = ujiLab.filter((u) => u.periode === p.minggu);
  const jumlahkan = (rows: any[], kolom: string) =>
    rows.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);

  return {
    leptospira_positif: jumlahkan(barisMinggu, 'total_positif_leptospira'),
    pes_positif: jumlahkan(barisMinggu, 'total_positif_pes'),
    hantavirus_positif: jumlahkan(barisMinggu, 'total_positif_hantavirus'),
    diuji_lab: jumlahkan(ujiLabMinggu, 'diuji_lab'),
    leptospira_negatif: jumlahkan(ujiLabMinggu, 'leptospira_negatif'),
    pes_negatif: jumlahkan(ujiLabMinggu, 'pes_negatif'),
    hantavirus_negatif: jumlahkan(ujiLabMinggu, 'hantavirus_negatif'),
  };
}

async function ambilTikusLabBulanan(
  p: PeriodeBulanan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const [ringkasan, ujiLab] = await Promise.all([
    getRingkasanVektorTikusBulanan(p.tahun, wilayahKerja),
    getUjiLabVektorTikusBulanan(p.tahun, wilayahKerja),
  ]);

  const barisBulan = (ringkasan as any[]).filter((r) => r.bulan === p.bulan);
  const ujiLabBulan = ujiLab.filter((u) => u.periode === p.bulan);
  const jumlahkan = (rows: any[], kolom: string) =>
    rows.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);

  return {
    leptospira_positif: jumlahkan(barisBulan, 'total_positif_leptospira'),
    pes_positif: jumlahkan(barisBulan, 'total_positif_pes'),
    hantavirus_positif: jumlahkan(barisBulan, 'total_positif_hantavirus'),
    diuji_lab: jumlahkan(ujiLabBulan, 'diuji_lab'),
    leptospira_negatif: jumlahkan(ujiLabBulan, 'leptospira_negatif'),
    pes_negatif: jumlahkan(ujiLabBulan, 'pes_negatif'),
    hantavirus_negatif: jumlahkan(ujiLabBulan, 'hantavirus_negatif'),
  };
}

async function ambilVektorTikusMingguan(
  p: PeriodeMingguan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const ringkasan = await getRingkasanVektorTikus(p.tahun, wilayahKerja);
  const barisMinggu = (ringkasan as any[]).filter((r) => r.minggu_epid === p.minggu);
  const jumlahkan = (kolom: string) =>
    barisMinggu.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);
  const rerata = (kolom: string) => {
    const nilai = barisMinggu.map((r) => Number(r[kolom]) || 0).filter((v) => v > 0);
    return nilai.length > 0 ? Number((nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(2)) : 0;
  };

  return {
    trap_dipasang: jumlahkan('jml_trap_dipasang'),
    trap_tertangkap: jumlahkan('jml_trap_tertangkap'),
    tsi_rerata: rerata('tsi_rerata'),
    index_pinjal_rerata: rerata('index_pinjal_rerata'),
    rattus_tanezumi: jumlahkan('rt'),
    rattus_norvegicus: jumlahkan('rn'),
    mus_musculus: jumlahkan('mm'),
    spesies_lainnya: jumlahkan('jenis_lainnya'),
  };
}

async function ambilVektorTikusBulanan(
  p: PeriodeBulanan,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const ringkasan = await getRingkasanVektorTikusBulanan(p.tahun, wilayahKerja);
  const barisBulan = (ringkasan as any[]).filter((r) => r.bulan === p.bulan);
  const jumlahkan = (kolom: string) =>
    barisBulan.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);
  const rerata = (kolom: string) => {
    const nilai = barisBulan.map((r) => Number(r[kolom]) || 0).filter((v) => v > 0);
    return nilai.length > 0 ? Number((nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(2)) : 0;
  };

  return {
    trap_dipasang: jumlahkan('jml_trap_dipasang'),
    trap_tertangkap: jumlahkan('jml_trap_tertangkap'),
    tsi_rerata: rerata('tsi_rerata'),
    index_pinjal_rerata: rerata('index_pinjal_rerata'),
    rattus_tanezumi: jumlahkan('rt'),
    rattus_norvegicus: jumlahkan('rn'),
    mus_musculus: jumlahkan('mm'),
    spesies_lainnya: jumlahkan('jenis_lainnya'),
  };
}

async function ambilVektorTikusRentangMingguan(
  tahun: number,
  mgDari: number,
  mgSampai: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const ringkasan = await getRingkasanVektorTikus(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter(
    (r) => r.minggu_epid >= mgDari && r.minggu_epid <= mgSampai
  );
  const jumlahkan = (kolom: string) => baris.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);
  const rerata = (kolom: string) => {
    const nilai = baris.map((r) => Number(r[kolom]) || 0).filter((v) => v > 0);
    return nilai.length > 0 ? Number((nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(2)) : 0;
  };

  return {
    trap_dipasang: jumlahkan('jml_trap_dipasang'),
    trap_tertangkap: jumlahkan('jml_trap_tertangkap'),
    tsi_rerata: rerata('tsi_rerata'),
    index_pinjal_rerata: rerata('index_pinjal_rerata'),
    rattus_tanezumi: jumlahkan('rt'),
    rattus_norvegicus: jumlahkan('rn'),
    mus_musculus: jumlahkan('mm'),
    spesies_lainnya: jumlahkan('jenis_lainnya'),
  };
}

async function ambilVektorTikusRentangBulanan(
  tahun: number,
  bulanDari: number,
  bulanSampai: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const ringkasan = await getRingkasanVektorTikusBulanan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter(
    (r) => r.bulan >= bulanDari && r.bulan <= bulanSampai
  );
  const jumlahkan = (kolom: string) => baris.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);
  const rerata = (kolom: string) => {
    const nilai = baris.map((r) => Number(r[kolom]) || 0).filter((v) => v > 0);
    return nilai.length > 0 ? Number((nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(2)) : 0;
  };

  return {
    trap_dipasang: jumlahkan('jml_trap_dipasang'),
    trap_tertangkap: jumlahkan('jml_trap_tertangkap'),
    tsi_rerata: rerata('tsi_rerata'),
    index_pinjal_rerata: rerata('index_pinjal_rerata'),
    rattus_tanezumi: jumlahkan('rt'),
    rattus_norvegicus: jumlahkan('rn'),
    mus_musculus: jumlahkan('mm'),
    spesies_lainnya: jumlahkan('jenis_lainnya'),
  };
}

async function ambilTikusLabRentangMingguan(
  tahun: number,
  mgDari: number,
  mgSampai: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const [ringkasan, ujiLab] = await Promise.all([
    getRingkasanVektorTikus(tahun, wilayahKerja),
    getUjiLabVektorTikusMingguan(tahun, wilayahKerja),
  ]);

  const barisRentang = (ringkasan as any[]).filter((r) => r.minggu_epid >= mgDari && r.minggu_epid <= mgSampai);
  const ujiLabRentang = ujiLab.filter((u) => u.periode >= mgDari && u.periode <= mgSampai);
  const jumlahkan = (rows: any[], kolom: string) =>
    rows.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);

  return {
    leptospira_positif: jumlahkan(barisRentang, 'total_positif_leptospira'),
    pes_positif: jumlahkan(barisRentang, 'total_positif_pes'),
    hantavirus_positif: jumlahkan(barisRentang, 'total_positif_hantavirus'),
    diuji_lab: jumlahkan(ujiLabRentang, 'diuji_lab'),
    leptospira_negatif: jumlahkan(ujiLabRentang, 'leptospira_negatif'),
    pes_negatif: jumlahkan(ujiLabRentang, 'pes_negatif'),
    hantavirus_negatif: jumlahkan(ujiLabRentang, 'hantavirus_negatif'),
  };
}

async function ambilTikusLabRentangBulanan(
  tahun: number,
  bulanDari: number,
  bulanSampai: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const [ringkasan, ujiLab] = await Promise.all([
    getRingkasanVektorTikusBulanan(tahun, wilayahKerja),
    getUjiLabVektorTikusBulanan(tahun, wilayahKerja),
  ]);

  const barisRentang = (ringkasan as any[]).filter((r) => r.bulan >= bulanDari && r.bulan <= bulanSampai);
  const ujiLabRentang = ujiLab.filter((u) => u.periode >= bulanDari && u.periode <= bulanSampai);
  const jumlahkan = (rows: any[], kolom: string) =>
    rows.reduce((total, r) => total + (Number(r[kolom]) || 0), 0);

  return {
    leptospira_positif: jumlahkan(barisRentang, 'total_positif_leptospira'),
    pes_positif: jumlahkan(barisRentang, 'total_positif_pes'),
    hantavirus_positif: jumlahkan(barisRentang, 'total_positif_hantavirus'),
    diuji_lab: jumlahkan(ujiLabRentang, 'diuji_lab'),
    leptospira_negatif: jumlahkan(ujiLabRentang, 'leptospira_negatif'),
    pes_negatif: jumlahkan(ujiLabRentang, 'pes_negatif'),
    hantavirus_negatif: jumlahkan(ujiLabRentang, 'hantavirus_negatif'),
  };
}

async function ambilVektorDiareMingguan(
  p: PeriodeMingguan,
  jenis: 'lalat' | 'kecoa',
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const dataMingguan = await getTrenDiareMultiVariabel(p.tahun, jenis, wilayahKerja);
  const baris = (dataMingguan as any[]).find((r) => r.minggu_epid === p.minggu);
  if (!baris) return {};
  const hasil: Record<string, number> = {};
  for (const [k, v] of Object.entries(baris)) {
    if (typeof v === 'number') hasil[k] = v;
  }
  return hasil;
}

const KOLOM_RERATA_DIARE_SUFFIX = '_rerata';

function agregasiDiareRentang(rows: any[]): Record<string, number> {
  if (rows.length === 0) return {};
  const kunciNumerik = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (typeof r[k] === 'number') kunciNumerik.add(k); }));

  const hasil: Record<string, number> = {};
  kunciNumerik.forEach((k) => {
    const nilai = rows.map((r) => Number(r[k]) || 0);
    if (k.endsWith(KOLOM_RERATA_DIARE_SUFFIX)) {
      const nonZero = nilai.filter((v) => v > 0);
      hasil[k] = nonZero.length > 0 ? Number((nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(2)) : 0;
    } else {
      hasil[k] = nilai.reduce((a, b) => a + b, 0);
    }
  });
  return hasil;
}

async function ambilVektorDiareRentangMingguan(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  mgAwal: number,
  mgAkhir: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const rows = await getTrenDiareMultiVariabel(tahun, jenis, wilayahKerja);
  const terfilter = (rows as any[]).filter(
    (r) => r.minggu_epid >= mgAwal && r.minggu_epid <= mgAkhir
  );
  return agregasiDiareRentang(terfilter);
}

async function ambilVektorDiareBulananSatuBulan(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  bulan: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const rows = await getTrenDiareBulanan(tahun, jenis, wilayahKerja);
  const baris = (rows as any[]).find((r) => r.bulan === bulan);
  if (!baris) return {};
  const hasil: Record<string, number> = {};
  for (const [k, v] of Object.entries(baris)) {
    if (typeof v === 'number') hasil[k] = v;
  }
  return hasil;
}

async function ambilVektorDiareRentangBulanan(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  bulanAwal: number,
  bulanAkhir: number,
  wilayahKerja: string | undefined
): Promise<Record<string, number>> {
  const rows = await getTrenDiareBulanan(tahun, jenis, wilayahKerja);
  const terfilter = (rows as any[]).filter((r) => r.bulan >= bulanAwal && r.bulan <= bulanAkhir);
  return agregasiDiareRentang(terfilter);
}

async function ambilAnophelesRingkasan(
  tahun: number,
  wilayahKerja: string | undefined,
  granularitas: 'mingguan' | 'bulanan',
  tipe: 'dewasa' | 'larva',
  periodeUrutan: number
): Promise<Record<string, number>> {
  const rows =
    tipe === 'dewasa'
      ? await getTrenAnophelesDewasa(tahun, wilayahKerja, granularitas)
      : await getTrenLarva(tahun, wilayahKerja, granularitas);

  const cocok =
    granularitas === 'mingguan'
      ? (rows as any[]).find((r) => Number(r.minggu_epid) === periodeUrutan)
      : rows[periodeUrutan - 1];

  if (!cocok) return {};
  const hasil: Record<string, number> = {};
  for (const [k, v] of Object.entries(cocok)) {
    if (typeof v === 'number') hasil[k] = v;
  }
  return hasil;
}

const KOLOM_RERATA_ANOPHELES = ['mhd', 'mbr', 'suhu', 'kelembaban'];

function agregasiAnophelesRentang(rows: any[]): Record<string, number> {
  if (rows.length === 0) return {};
  const kunciSemua = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (typeof r[k] === 'number') kunciSemua.add(k); }));

  const hasil: Record<string, number> = {};
  kunciSemua.forEach((k) => {
    const nilai = rows.map((r) => Number(r[k]) || 0);
    if (KOLOM_RERATA_ANOPHELES.includes(k)) {
      const nonZero = nilai.filter((v) => v > 0);
      hasil[k] = nonZero.length > 0 ? Number((nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(2)) : 0;
    } else {
      hasil[k] = nilai.reduce((a, b) => a + b, 0);
    }
  });
  return hasil;
}

async function ambilAnophelesRentang(
  tahun: number,
  wilayahKerja: string | undefined,
  tipe: 'dewasa' | 'larva',
  mgAwal: number,
  mgAkhir: number
): Promise<Record<string, number>> {
  const rows =
    tipe === 'dewasa'
      ? await getTrenAnophelesDewasa(tahun, wilayahKerja, 'mingguan')
      : await getTrenLarva(tahun, wilayahKerja, 'mingguan');
  const terfilter = (rows as any[]).filter(
    (r) => Number(r.minggu_epid) >= mgAwal && Number(r.minggu_epid) <= mgAkhir
  );
  return agregasiAnophelesRentang(terfilter);
}

async function ambilAnophelesRentangBulanan(
  tahun: number,
  wilayahKerja: string | undefined,
  tipe: 'dewasa' | 'larva',
  bulanAwal: number,
  bulanAkhir: number
): Promise<Record<string, number>> {
  const rows =
    tipe === 'dewasa'
      ? await getTrenAnophelesDewasa(tahun, wilayahKerja, 'bulanan')
      : await getTrenLarva(tahun, wilayahKerja, 'bulanan');
  const terfilter = (rows as any[]).filter((_, idx) => idx + 1 >= bulanAwal && idx + 1 <= bulanAkhir);
  return agregasiAnophelesRentang(terfilter);
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
  const wilayahUntukQuery = tabel === 'phqc' ? resolveWilayahPhqcDb(wilayahKerja) : wilayahKerja;
  const baris = await (getKategoriBreakdown as any)(tabel, periode, {
    ...filterPeriode,
    ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
  });

  return (baris as { kategori: string; nilai: string; jumlah: number }[])
    .filter((b) => b.nilai !== 'Tidak Diisi')
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 8);
}

const NAMA_WILKER: Record<string, string> = {
  WK01: 'Pelabuhan Samarinda',
  WK02: 'Pelabuhan Tanjung Santan',
  WK03: 'Pelabuhan Tanjung Laut',
  WK04: 'Pelabuhan Lhoktuan',
  WK05: 'Pelabuhan Sangatta',
  WK06: 'Pelabuhan Sangkulirang',
  WK07: 'Bandara APT Pranoto',
};

const DAFTAR_WILAYAH_COP = [
  'Samarinda', 'TanjungSantan', 'TanjungLaut', 'Lhoktuan', 'Sangatta', 'Sangkulirang',
] as const;

const MAP_WILAYAH_DB_PHQC: Record<string, string> = {
  Samarinda: 'Samarinda',
  TanjungLaut: 'Pelabuhan Tanjung Laut',
  Sangkulirang: 'Pelabuhan Laut Sangkulirang',
  Sangatta: 'Pelabuhan Laut Sangatta',
  Lhoktuan: 'Pelabuhan Lhok Tuan',
  TanjungSantan: 'Pelabuhan Laut Tanjung Santan',
};

function resolveWilayahPhqcDb(wilayahKerja: string | undefined): string | undefined {
  if (!wilayahKerja) return undefined;
  return MAP_WILAYAH_DB_PHQC[wilayahKerja] ?? wilayahKerja;
}

async function ambilNegaraKedatanganPeriode(
  tahun: number,
  urutan: number,
  wilayahKerja: string | undefined,
  granularitas: 'mingguan' | 'bulanan'
): Promise<Record<string, number>> {
  const filter =
    granularitas === 'mingguan'
      ? { tahun_epid: tahun, minggu_epid: urutan, kategori: 'negara_kedatangan' as const }
      : { tahun, bulan: urutan, kategori: 'negara_kedatangan' as const };

  const baris = await (getKategoriBreakdown as any)('cop', granularitas, {
    ...filter,
    ...(wilayahKerja ? { wilayah_kerja: wilayahKerja } : {}),
  });

  const peta = new Map<string, number>();
  (baris as { nilai: string; jumlah: number }[]).forEach((b) => {
    const nilai = b.nilai?.trim();
    if (!nilai) return;
    peta.set(nilai, (peta.get(nilai) ?? 0) + b.jumlah);
  });
  return Object.fromEntries(peta.entries());
}

function pangkasTopNegara(
  saatIniPenuh: Record<string, number>,
  sebelumnyaPenuh: Record<string, number>,
  maxNegara = 8
): { saatIni: Record<string, number>; sebelumnya: Record<string, number> } {
  const semuaNegara = new Set([...Object.keys(saatIniPenuh), ...Object.keys(sebelumnyaPenuh)]);
  const terurut = Array.from(semuaNegara)
    .sort(
      (a, b) =>
        (saatIniPenuh[b] ?? 0) + (sebelumnyaPenuh[b] ?? 0) -
        ((saatIniPenuh[a] ?? 0) + (sebelumnyaPenuh[a] ?? 0))
    )
    .slice(0, maxNegara);

  const saatIni: Record<string, number> = {};
  const sebelumnya: Record<string, number> = {};
  terurut.forEach((negara) => {
    saatIni[negara] = saatIniPenuh[negara] ?? 0;
    sebelumnya[negara] = sebelumnyaPenuh[negara] ?? 0;
  });
  return { saatIni, sebelumnya };
}

async function ambilDataBreakdownPerWilkerCop(periodeKey: string): Promise<DataBreakdownAnalisis> {
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);

  let labelPeriode: string;
  let baris: { wilayah_kerja: string; jumlah_kapal: number }[];

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);
    labelPeriode = labelPeriodeMingguan(p);
    const semua = await getRingkasanMingguan('cop', p.tahun);
    baris = semua.filter((b) => b.minggu_epid === p.minggu);
  } else {
    const p = parsePeriodeBulanan(periodeKey);
    labelPeriode = labelPeriodeBulanan(p);
    const semua = await getRingkasanBulanan('cop', p.tahun);
    baris = semua.filter((b) => b.bulan === p.bulan);
  }

  const peta = new Map<string, number>();
  baris.forEach((b) => peta.set(b.wilayah_kerja, (peta.get(b.wilayah_kerja) ?? 0) + b.jumlah_kapal));

  const breakdown = DAFTAR_WILAYAH_COP
    .map((w) => ({ nilai: w, jumlah: peta.get(w) ?? 0 }))
    .sort((a, b) => b.jumlah - a.jumlah);
  const totalKapal = breakdown.reduce((total, b) => total + b.jumlah, 0);

  return {
    labelKonteks: 'Perbandingan Kedatangan Kapal Antar Wilayah Kerja (Kegiatan COP)',
    labelWilayah: 'Seluruh wilayah kerja BKK Kelas I Samarinda (perbandingan 6 wilayah)',
    labelPeriode,
    totalKapal,
    breakdown,
  };
}

export async function ambilDataAnalisis(
  konteks: KonteksAnalisis,
  periodeKey: string,
  wilayahKerja: string | undefined,
  metrik?: MetrikVektor
): Promise<DataAnalisis> {
  if (konteks === 'vektor-dbd-mingguan' || konteks === 'vektor-dbd-bulanan') {
    return ambilDataAnalisisVektorDbdRentang(periodeKey, wilayahKerja, metrik);
  }

  const labelWilayah = wilayahKerja
  ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
  : 'Seluruh wilayah kerja BKK Kelas I Samarinda';

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
  } 

  if (konteks === 'vektor-tikus-mingguan' || konteks === 'vektor-tikus-bulanan') {
    if (konteks === 'vektor-tikus-mingguan') {
      if (isPeriodeRentangMingguan(periodeKey)) {
        const r = parseRentangMingguan(periodeKey);
        const adaSebelumnya = r.mingguAwal > 1;
        const [saatIni, sebelumnya] = await Promise.all([
          ambilVektorTikusRentangMingguan(r.tahun, r.mingguAwal, r.mingguAkhir, wilayahKerja),
          adaSebelumnya
            ? ambilVektorTikusRentangMingguan(r.tahun, 1, r.mingguAwal - 1, wilayahKerja)
            : Promise.resolve({}),
        ]);
        return {
          labelKonteks: 'Surveilans Vektor Tikus — Trap & Distribusi Spesies',
          labelWilayah,
          labelPeriodeSaatIni: labelRentangMingguan(r),
          labelPeriodeSebelumnya: adaSebelumnya
            ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
            : 'Tidak ada data sebelum minggu ke-1',
          ringkasanSaatIni: saatIni,
          ringkasanSebelumnya: sebelumnya,
          topKategori: [],
        };
      }
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilVektorTikusMingguan(periodeSaatIni, wilayahKerja),
        ambilVektorTikusMingguan(periodeSebelumnya, wilayahKerja),
      ]);
      return {
        labelKonteks: 'Surveilans Vektor Tikus — Trap & Distribusi Spesies',
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    if (isPeriodeRentangBulanan(periodeKey)) {
      const r = parseRentangBulanan(periodeKey);
      const adaSebelumnya = r.bulanAwal > 1;
      const [saatIni, sebelumnya] = await Promise.all([
        ambilVektorTikusRentangBulanan(r.tahun, r.bulanAwal, r.bulanAkhir, wilayahKerja),
        adaSebelumnya
          ? ambilVektorTikusRentangBulanan(r.tahun, 1, r.bulanAwal - 1, wilayahKerja)
          : Promise.resolve({}),
      ]);
      return {
        labelKonteks: 'Surveilans Vektor Tikus — Trap & Distribusi Spesies',
        labelWilayah,
        labelPeriodeSaatIni: labelRentangBulanan(r),
        labelPeriodeSebelumnya: adaSebelumnya
          ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
          : 'Tidak ada data sebelum bulan pertama',
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilVektorTikusBulanan(periodeSaatIni, wilayahKerja),
      ambilVektorTikusBulanan(periodeSebelumnya, wilayahKerja),
    ]);
    return {
      labelKonteks: 'Surveilans Vektor Tikus — Trap & Distribusi Spesies',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  if (
    konteks === 'vektor-diare-lalat-mingguan' ||
    konteks === 'vektor-diare-kecoa-mingguan' ||
    konteks === 'vektor-diare-lalat-bulanan' ||
    konteks === 'vektor-diare-kecoa-bulanan'
  ) {
    const jenis: 'lalat' | 'kecoa' = konteks.includes('lalat') ? 'lalat' : 'kecoa';
    const labelJenis = jenis === 'lalat' ? 'Lalat (Fly Index)' : 'Kecoa (Kepadatan/m²)';

    if (konteks.endsWith('-mingguan')) {
      if (isPeriodeRentangMingguan(periodeKey)) {
        const r = parseRentangMingguan(periodeKey);
        const adaSebelumnya = r.mingguAwal > 1;
        const [saatIni, sebelumnya] = await Promise.all([
          ambilVektorDiareRentangMingguan(r.tahun, jenis, r.mingguAwal, r.mingguAkhir, wilayahKerja),
          adaSebelumnya
            ? ambilVektorDiareRentangMingguan(r.tahun, jenis, 1, r.mingguAwal - 1, wilayahKerja)
            : Promise.resolve({}),
        ]);
        return {
          labelKonteks: `Surveilans Vektor Diare — ${labelJenis}`,
          labelWilayah,
          labelPeriodeSaatIni: labelRentangMingguan(r),
          labelPeriodeSebelumnya: adaSebelumnya
            ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
            : 'Tidak ada data sebelum minggu ke-1',
          ringkasanSaatIni: saatIni,
          ringkasanSebelumnya: sebelumnya,
          topKategori: [],
        };
      }
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilVektorDiareMingguan(periodeSaatIni, jenis, wilayahKerja),
        ambilVektorDiareMingguan(periodeSebelumnya, jenis, wilayahKerja),
      ]);
      return {
        labelKonteks: `Surveilans Vektor Diare — ${labelJenis}`,
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    if (isPeriodeRentangBulanan(periodeKey)) {
      const r = parseRentangBulanan(periodeKey);
      const adaSebelumnya = r.bulanAwal > 1;
      const [saatIni, sebelumnya] = await Promise.all([
        ambilVektorDiareRentangBulanan(r.tahun, jenis, r.bulanAwal, r.bulanAkhir, wilayahKerja),
        adaSebelumnya
          ? ambilVektorDiareRentangBulanan(r.tahun, jenis, 1, r.bulanAwal - 1, wilayahKerja)
          : Promise.resolve({}),
      ]);
      return {
        labelKonteks: `Surveilans Vektor Diare — ${labelJenis}`,
        labelWilayah,
        labelPeriodeSaatIni: labelRentangBulanan(r),
        labelPeriodeSebelumnya: adaSebelumnya
          ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
          : 'Tidak ada data sebelum bulan pertama',
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilVektorDiareBulananSatuBulan(periodeSaatIni.tahun, jenis, periodeSaatIni.bulan, wilayahKerja),
      ambilVektorDiareBulananSatuBulan(periodeSebelumnya.tahun, jenis, periodeSebelumnya.bulan, wilayahKerja),
    ]);
    return {
      labelKonteks: `Surveilans Vektor Diare — ${labelJenis}`,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  if (konteks === 'tikus-lab-mingguan' || konteks === 'tikus-lab-bulanan') {
    if (konteks === 'tikus-lab-mingguan') {
      if (isPeriodeRentangMingguan(periodeKey)) {
        const r = parseRentangMingguan(periodeKey);
        const adaSebelumnya = r.mingguAwal > 1;
        const [saatIni, sebelumnya] = await Promise.all([
          ambilTikusLabRentangMingguan(r.tahun, r.mingguAwal, r.mingguAkhir, wilayahKerja),
          adaSebelumnya
            ? ambilTikusLabRentangMingguan(r.tahun, 1, r.mingguAwal - 1, wilayahKerja)
            : Promise.resolve({}),
        ]);
        return {
          labelKonteks: 'Surveilans Vektor Tikus — Uji Lab & Hasil Pemeriksaan (Leptospirosis, Pes, Hantavirus)',
          labelWilayah,
          labelPeriodeSaatIni: labelRentangMingguan(r),
          labelPeriodeSebelumnya: adaSebelumnya
            ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
            : 'Tidak ada data sebelum minggu ke-1',
          ringkasanSaatIni: saatIni,
          ringkasanSebelumnya: sebelumnya,
          topKategori: [],
        };
      }
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilTikusLabMingguan(periodeSaatIni, wilayahKerja),
        ambilTikusLabMingguan(periodeSebelumnya, wilayahKerja),
      ]);
      return {
        labelKonteks: 'Surveilans Vektor Tikus — Uji Lab & Hasil Pemeriksaan (Leptospirosis, Pes, Hantavirus)',
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    if (isPeriodeRentangBulanan(periodeKey)) {
      const r = parseRentangBulanan(periodeKey);
      const adaSebelumnya = r.bulanAwal > 1;
      const [saatIni, sebelumnya] = await Promise.all([
        ambilTikusLabRentangBulanan(r.tahun, r.bulanAwal, r.bulanAkhir, wilayahKerja),
        adaSebelumnya
          ? ambilTikusLabRentangBulanan(r.tahun, 1, r.bulanAwal - 1, wilayahKerja)
          : Promise.resolve({}),
      ]);
      return {
        labelKonteks: 'Surveilans Vektor Tikus — Uji Lab & Hasil Pemeriksaan (Leptospirosis, Pes, Hantavirus)',
        labelWilayah,
        labelPeriodeSaatIni: labelRentangBulanan(r),
        labelPeriodeSebelumnya: adaSebelumnya
          ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
          : 'Tidak ada data sebelum bulan pertama',
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilTikusLabBulanan(periodeSaatIni, wilayahKerja),
      ambilTikusLabBulanan(periodeSebelumnya, wilayahKerja),
    ]);
    return {
      labelKonteks: 'Surveilans Vektor Tikus — Uji Lab & Hasil Pemeriksaan (Leptospirosis, Pes, Hantavirus)',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }
  

  if (
    konteks === 'anopheles-dewasa-mingguan' ||
    konteks === 'anopheles-dewasa-bulanan' ||
    konteks === 'anopheles-larva-mingguan' ||
    konteks === 'anopheles-larva-bulanan'
  ) {
    const tipe: 'dewasa' | 'larva' = konteks.startsWith('anopheles-dewasa') ? 'dewasa' : 'larva';
    const labelTipe = tipe === 'dewasa' ? 'Anopheles Dewasa (MHD/MBR)' : 'Larva Anopheles';

    if (konteks.endsWith('-mingguan')) {
      if (isPeriodeRentangMingguan(periodeKey)) {
        const r = parseRentangMingguan(periodeKey);
        const adaSebelumnya = r.mingguAwal > 1;
        const [saatIni, sebelumnya] = await Promise.all([
          ambilAnophelesRentang(r.tahun, wilayahKerja, tipe, r.mingguAwal, r.mingguAkhir),
          adaSebelumnya
            ? ambilAnophelesRentang(r.tahun, wilayahKerja, tipe, 1, r.mingguAwal - 1)
            : Promise.resolve({}),
        ]);
        return {
          labelKonteks: `Surveilans Vektor — ${labelTipe}`,
          labelWilayah,
          labelPeriodeSaatIni: labelRentangMingguan(r),
          labelPeriodeSebelumnya: adaSebelumnya
            ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
            : 'Tidak ada data sebelum minggu ke-1',
          ringkasanSaatIni: saatIni,
          ringkasanSebelumnya: sebelumnya,
          topKategori: [],
        };
      }
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilAnophelesRingkasan(periodeSaatIni.tahun, wilayahKerja, 'mingguan', tipe, periodeSaatIni.minggu),
        ambilAnophelesRingkasan(periodeSebelumnya.tahun, wilayahKerja, 'mingguan', tipe, periodeSebelumnya.minggu),
      ]);
      return {
        labelKonteks: `Surveilans Vektor — ${labelTipe}`,
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    if (isPeriodeRentangBulanan(periodeKey)) {
      const r = parseRentangBulanan(periodeKey);
      const adaSebelumnya = r.bulanAwal > 1;
      const [saatIni, sebelumnya] = await Promise.all([
        ambilAnophelesRentangBulanan(r.tahun, wilayahKerja, tipe, r.bulanAwal, r.bulanAkhir),
        adaSebelumnya
          ? ambilAnophelesRentangBulanan(r.tahun, wilayahKerja, tipe, 1, r.bulanAwal - 1)
          : Promise.resolve({}),
      ]);
      return {
        labelKonteks: `Surveilans Vektor — ${labelTipe}`,
        labelWilayah,
        labelPeriodeSaatIni: labelRentangBulanan(r),
        labelPeriodeSebelumnya: adaSebelumnya
          ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
          : 'Tidak ada data sebelum bulan pertama',
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilAnophelesRingkasan(periodeSaatIni.tahun, wilayahKerja, 'bulanan', tipe, periodeSaatIni.bulan),
      ambilAnophelesRingkasan(periodeSebelumnya.tahun, wilayahKerja, 'bulanan', tipe, periodeSebelumnya.bulan),
    ]);
    return {
      labelKonteks: `Surveilans Vektor — ${labelTipe}`,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }
    if (
      konteks === 'tpp-bulanan' || konteks === 'ttu-bulanan' || konteks === 'pab-bulanan' ||
      konteks === 'tpp-mingguan' || konteks === 'ttu-mingguan' || konteks === 'pab-mingguan'
    ) {
      const labelModul =
        konteks.startsWith('tpp') ? 'Surveilans TPP (Tempat Pengelolaan Pangan)'
        : konteks.startsWith('ttu') ? 'Surveilans TTU (Tempat-Tempat Umum)'
        : 'Surveilans PAB (Penyediaan Air Bersih)';

      if (konteks.endsWith('-mingguan')) {
        const periodeSaatIni = parsePeriodeMingguan(periodeKey);
        const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
        const ambil =
          konteks === 'tpp-mingguan' ? ambilTppMingguan
          : konteks === 'ttu-mingguan' ? ambilTtuMingguan
          : ambilPabMingguan;
        const [saatIni, sebelumnya] = await Promise.all([
          ambil(periodeSaatIni, wilayahKerja),
          ambil(periodeSebelumnya, wilayahKerja),
        ]);
        return {
          labelKonteks: labelModul,
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
      const ambil =
        konteks === 'tpp-bulanan' ? ambilTppBulanan : konteks === 'ttu-bulanan' ? ambilTtuBulanan : ambilPabBulanan;
      const [saatIni, sebelumnya] = await Promise.all([
        ambil(periodeSaatIni, wilayahKerja),
        ambil(periodeSebelumnya, wilayahKerja),
      ]);
      return {
        labelKonteks: labelModul,
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
        ringkasanSaatIni: saatIni,
        ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

  if (konteks === 'cop-negara-tren') {
    const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);

    if (isMingguan) {
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIniPenuh, sebelumnyaPenuh] = await Promise.all([
        ambilNegaraKedatanganPeriode(periodeSaatIni.tahun, periodeSaatIni.minggu, wilayahKerja, 'mingguan'),
        ambilNegaraKedatanganPeriode(periodeSebelumnya.tahun, periodeSebelumnya.minggu, wilayahKerja, 'mingguan'),
      ]);
      const { saatIni, sebelumnya } = pangkasTopNegara(saatIniPenuh, sebelumnyaPenuh);
      return {
        labelKonteks: 'Tren Kedatangan Kapal per Negara Asal (Kegiatan COP)',
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
    const [saatIniPenuh, sebelumnyaPenuh] = await Promise.all([
      ambilNegaraKedatanganPeriode(periodeSaatIni.tahun, periodeSaatIni.bulan, wilayahKerja, 'bulanan'),
      ambilNegaraKedatanganPeriode(periodeSebelumnya.tahun, periodeSebelumnya.bulan, wilayahKerja, 'bulanan'),
    ]);
    const { saatIni, sebelumnya } = pangkasTopNegara(saatIniPenuh, sebelumnyaPenuh);
    return {
      labelKonteks: 'Tren Kedatangan Kapal per Negara Asal (Kegiatan COP)',
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
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

const KOLOM_ANGKA_TPP = [
  'jumlah_tpp_diperiksa', 'total_sampel', 'ikl_ms', 'ikl_tms',
  'tms_formaldehyde', 'tms_borax', 'tms_metyl_yellow', 'tms_rodamin_b',
  'tms_bakteriologis', 'tms_hy_rise',
] as const;

const KOLOM_ANGKA_TTU = [
  'jumlah_diperiksa', 'jumlah_ms', 'jumlah_tms',
  'tms_lingkungan_luar_halaman', 'tms_ruang_bangunan', 'tms_penyehatan_air',
  'tms_penyehatan_udara_ruang', 'tms_pengelolaan_limbah', 'tms_pencahayaan',
  'tms_kebisingan', 'tms_getaran_diruang_kerja', 'tms_pengendalian_vektor_penyakit',
  'tms_instalasi', 'tms_pemeliharaan_jamban_kamar_mandi',
] as const;

const KOLOM_ANGKA_PAB = [
  'jumlah_pemeriksaan', 'total_pab_diperiksa', 'tms_fisik', 'tms_kimia', 'tms_bakteriologis',
] as const;

async function ambilTppBulanan(p: PeriodeBulanan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTppBulanan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.bulan === p.bulan);
  return cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_TPP as any);
}

async function ambilTtuBulanan(p: PeriodeBulanan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTtuBulanan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.bulan === p.bulan);
  return cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_TTU as any);
}

async function ambilPabBulanan(p: PeriodeBulanan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanPabBulanan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.bulan === p.bulan);
  return cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_PAB as any);
}

async function ambilTppMingguan(p: PeriodeMingguan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTppMingguan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.minggu === p.minggu);
  return cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_TPP as any);
}

async function ambilTtuMingguan(p: PeriodeMingguan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTtuMingguan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.minggu === p.minggu);
  return cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_TTU as any);
}

async function ambilPabMingguan(p: PeriodeMingguan, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanPabMingguan(p.tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => r.minggu === p.minggu);
  return cariAtauJumlahkan(baris, wilayahKerja, KOLOM_ANGKA_PAB as any);
}

// ============================================================
// KUMULATIF TPP/TTU/PAB (khusus tipe="analisis") -- menjumlahkan
// SEMUA baris dari periode 1 s.d. periode yang dipilih, BUKAN cuma
// satu periode tunggal seperti fungsi ambil*Mingguan/ambil*Bulanan
// di atas (yang tetap dipakai apa adanya untuk tipe="prediksi").
// ============================================================

async function ambilTppKumulatifMingguan(tahun: number, mingguAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTppMingguan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.minggu) >= 1 && Number(r.minggu) <= mingguAkhir);
  return jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_TPP as any);
}

async function ambilTppKumulatifBulanan(tahun: number, bulanAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTppBulanan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.bulan) >= 1 && Number(r.bulan) <= bulanAkhir);
  return jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_TPP as any);
}

async function ambilTtuKumulatifMingguan(tahun: number, mingguAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTtuMingguan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.minggu) >= 1 && Number(r.minggu) <= mingguAkhir);
  return jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_TTU as any);
}

async function ambilTtuKumulatifBulanan(tahun: number, bulanAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanTtuBulanan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.bulan) >= 1 && Number(r.bulan) <= bulanAkhir);
  return jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_TTU as any);
}

async function ambilPabKumulatifMingguan(tahun: number, mingguAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanPabMingguan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.minggu) >= 1 && Number(r.minggu) <= mingguAkhir);
  return jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_PAB as any);
}

async function ambilPabKumulatifBulanan(tahun: number, bulanAkhir: number, wilayahKerja: string | undefined) {
  const ringkasan = await getRingkasanPabBulanan(tahun, wilayahKerja);
  const baris = (ringkasan as any[]).filter((r) => Number(r.bulan) >= 1 && Number(r.bulan) <= bulanAkhir);
  return jumlahkanRentang(baris, wilayahKerja, KOLOM_ANGKA_PAB as any);
}

/**
 * Titik masuk KHUSUS untuk TPP/TTU/PAB, dipanggil route.ts menggantikan
 * ambilDataAnalisis() generik untuk ketiga konteks ini.
 *
 * - tipe="analisis"  : KUMULATIF, periode-1 s.d. periode yang dipilih
 *   user di grafik (mis. Minggu 1 s.d. 20, atau Januari s.d. Mei).
 *   Pembanding ("sebelumnya") = kumulatif s.d. satu periode sebelum
 *   periode terpilih (bukan tahun lalu -- datanya belum ada).
 * - tipe="prediksi"  : TIDAK BERUBAH -- tetap periode tunggal terkini
 *   vs periode tunggal sebelumnya, dipakai untuk proyeksi periode
 *   berikutnya.
 */
export async function ambilDataAnalisisSanitasi(
  konteks: 'tpp-mingguan' | 'tpp-bulanan' | 'ttu-mingguan' | 'ttu-bulanan' | 'pab-mingguan' | 'pab-bulanan',
  periodeKey: string,
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const labelModul =
    konteks.startsWith('tpp') ? 'Surveilans TPP (Tempat Pengelolaan Pangan)'
    : konteks.startsWith('ttu') ? 'Surveilans TTU (Tempat-Tempat Umum)'
    : 'Surveilans PAB (Penyediaan Air Bersih)';
  const isMingguan = konteks.endsWith('-mingguan');

  if (tipe === 'prediksi') {
    if (isMingguan) {
      const periodeSaatIni = parsePeriodeMingguan(periodeKey);
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const ambil =
        konteks === 'tpp-mingguan' ? ambilTppMingguan
        : konteks === 'ttu-mingguan' ? ambilTtuMingguan
        : ambilPabMingguan;
      const [saatIni, sebelumnya] = await Promise.all([
        ambil(periodeSaatIni, wilayahKerja),
        ambil(periodeSebelumnya, wilayahKerja),
      ]);
      return {
        labelKonteks: labelModul,
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
    const ambil =
      konteks === 'tpp-bulanan' ? ambilTppBulanan
      : konteks === 'ttu-bulanan' ? ambilTtuBulanan
      : ambilPabBulanan;
    const [saatIni, sebelumnya] = await Promise.all([
      ambil(periodeSaatIni, wilayahKerja),
      ambil(periodeSebelumnya, wilayahKerja),
    ]);
    return {
      labelKonteks: labelModul,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  if (isMingguan) {
    const periodeSaatIni = parsePeriodeMingguan(periodeKey);
    const ambilKumulatif =
      konteks === 'tpp-mingguan' ? ambilTppKumulatifMingguan
      : konteks === 'ttu-mingguan' ? ambilTtuKumulatifMingguan
      : ambilPabKumulatifMingguan;

    const [saatIni, sebelumnya] = await Promise.all([
      ambilKumulatif(periodeSaatIni.tahun, periodeSaatIni.minggu, wilayahKerja),
      ambilKumulatif(periodeSaatIni.tahun, periodeSaatIni.minggu - 1, wilayahKerja),
    ]);

    return {
      labelKonteks: labelModul,
      labelWilayah,
      labelPeriodeSaatIni: `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu} tahun ${periodeSaatIni.tahun} (kumulatif)`,
      labelPeriodeSebelumnya:
        periodeSaatIni.minggu > 1
          ? `Minggu epidemiologi 1 s.d. ${periodeSaatIni.minggu - 1} tahun ${periodeSaatIni.tahun} (kumulatif)`
          : 'Belum ada data sebelum minggu epidemiologi ke-1',
      ringkasanSaatIni: saatIni,
      ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  const periodeSaatIni = parsePeriodeBulanan(periodeKey);
  const ambilKumulatif =
    konteks === 'tpp-bulanan' ? ambilTppKumulatifBulanan
    : konteks === 'ttu-bulanan' ? ambilTtuKumulatifBulanan
    : ambilPabKumulatifBulanan;

  const [saatIni, sebelumnya] = await Promise.all([
    ambilKumulatif(periodeSaatIni.tahun, periodeSaatIni.bulan, wilayahKerja),
    ambilKumulatif(periodeSaatIni.tahun, periodeSaatIni.bulan - 1, wilayahKerja),
  ]);

  return {
    labelKonteks: labelModul,
    labelWilayah,
    labelPeriodeSaatIni: `Januari s.d. ${labelPeriodeBulanan(periodeSaatIni)} (kumulatif)`,
    labelPeriodeSebelumnya:
      periodeSaatIni.bulan > 1
        ? `Januari s.d. ${labelPeriodeBulanan({ jenis: 'bulanan', tahun: periodeSaatIni.tahun, bulan: periodeSaatIni.bulan - 1 })} (kumulatif)`
        : 'Belum ada data sebelum Januari',
    ringkasanSaatIni: saatIni,
    ringkasanSebelumnya: sebelumnya,
    topKategori: [],
  };
}

export type DataBreakdownAnalisis = {
  labelKonteks: string;
  labelWilayah: string;
  labelPeriode: string;
  totalKapal: number;
  breakdown: { nilai: string; jumlah: number }[];
};

const KATEGORI_PER_KONTEKS_BREAKDOWN: Record<KonteksBreakdown, string> = {
  'cop-rba': 'rba' satisfies KategoriCop,
  'cop-negara-asal': 'negara_kedatangan' satisfies KategoriCop,
  'cop-faktor-risiko': 'faktor_risiko' satisfies KategoriCop,
  'cop-per-wilker': 'wilayah_kerja',
  'phqc-daerah-asal': 'pelabuhan_kedatangan',
  'phqc-rba-mingguan': 'rba',
  'phqc-rba-bulanan': 'rba',
  'phqc-pelabuhan-mingguan': 'pelabuhan_kedatangan',
  'phqc-pelabuhan-bulanan': 'pelabuhan_kedatangan',
};

const TABEL_PER_KONTEKS_BREAKDOWN: Record<KonteksBreakdown, 'cop' | 'phqc'> = {
  'cop-rba': 'cop',
  'cop-negara-asal': 'cop',
  'cop-faktor-risiko': 'cop',
  'cop-per-wilker': 'cop',
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
  'cop-per-wilker': 'Perbandingan Kedatangan Kapal Antar Wilayah Kerja (Kegiatan COP)',
  'phqc-daerah-asal': 'Daerah Asal — Pelabuhan Kedatangan (Kegiatan PHQC)',
  'phqc-rba-mingguan': 'Klasifikasi Risiko (RBA) Kegiatan PHQC — Mingguan',
  'phqc-rba-bulanan': 'Klasifikasi Risiko (RBA) Kegiatan PHQC — Bulanan',
  'phqc-pelabuhan-mingguan': 'Pelabuhan Kedatangan & Tujuan (Kegiatan PHQC) — Mingguan',
  'phqc-pelabuhan-bulanan': 'Pelabuhan Kedatangan & Tujuan (Kegiatan PHQC) — Bulanan',
};

async function ambilDataBreakdownPelabuhanPhqc(
  periodeKey: string,
  wilayahKerja: string | undefined
): Promise<DataBreakdownAnalisis> {
  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const wilayahUntukQuery = resolveWilayahPhqcDb(wilayahKerja);
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
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
      }),
      (getKategoriBreakdown as any)('phqc', 'mingguan', {
        tahun_epid: p.tahun,
        minggu_epid: p.minggu,
        kategori: 'pelabuhan_tujuan',
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
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
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
      }),
      (getKategoriBreakdown as any)('phqc', 'bulanan', {
        tahun: p.tahun,
        bulan: p.bulan,
        kategori: 'pelabuhan_tujuan',
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
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

  const labelWilayah = wilayahKerja
  ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
  : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const kategori = KATEGORI_PER_KONTEKS_BREAKDOWN[konteks];
  const tabel = TABEL_PER_KONTEKS_BREAKDOWN[konteks];
  const wilayahUntukQuery = tabel === 'phqc' ? resolveWilayahPhqcDb(wilayahKerja) : wilayahKerja;
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
      ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
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