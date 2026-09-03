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
  getRingkasanRatGuardMingguan, 
  getRingkasanRatGuardBulanan,
} from '@/lib/supabase/queries';
import { getTrenDiareMultiVariabel, getTrenDiareBulanan } from '@/lib/supabase/queriesVektorDiareEnhanced';
import type { KategoriCop } from "@/types/domain.types";
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
import { getRingkasanPenyakitEmerging } from '@/lib/supabase/global-emerging-queries';
import type { RingkasanPenyakitEmerging, Penyakit, Negara } from '@/types/global-emerging.types';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA } from '@/types/global-emerging.types';
import { createClient } from '@/lib/supabase/server';
import { getRingkasanPesawatMingguan, getRingkasanPesawatBulanan } from '@/lib/supabase/queriesPesawat';
import { ambilPerbandinganIspaHotspot, ambilPerbandinganSkdrHotspot } from '@/lib/supabase/queries-karhutla-server';
import { DAFTAR_WILAYAH_KARHUTLA } from '@/lib/karhutla/constants';


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
  'global-emerging-mingguan',   // <-- tambah
  'global-emerging-bulanan',    // <-- tambah
  'nasional-emerging-mingguan',   // <-- tambah
  'nasional-emerging-bulanan',    // <-- tambah
  'abk-crew-penumpang-kedatangan-mingguan',
  'abk-crew-penumpang-kedatangan-bulanan',
  'abk-crew-penumpang-keberangkatan-mingguan',
  'abk-crew-penumpang-keberangkatan-bulanan',
  'skdr-mingguan',
  'skdr-tren-bulanan',
  'skdr-tren-mingguan',
  'karhutla-ispa-bulanan',
  'karhutla-ispa-mingguan',
  'skdr-ispa-mingguan',
  'klinik-kepatuhan-mingguan',
  'klinik-kepatuhan-bulanan',
] as const;

export const KONTEKS_BREAKDOWN = [
  'cop-rba',
  'cop-negara-asal',
  'cop-faktor-risiko',
  'cop-per-wilker', 
  'phqc-daerah-asal',
  'phqc-daerah-tujuan',
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
  'cop-mingguan',    // <-- tambah
  'cop-bulanan',     // <-- tambah
  'cop-faktor-risiko',
  'phqc-daerah-asal',
  'phqc-daerah-tujuan',
  'phqc-rba-mingguan',
  'phqc-rba-bulanan',
  'phqc-pelabuhan-mingguan',   // <-- TAMBAH
  'phqc-pelabuhan-bulanan',    // <-- TAMBAH
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
  'global-emerging-mingguan',   // <-- tambah
  'global-emerging-bulanan',    // <-- tambah
  'nasional-emerging-mingguan',   // <-- tambah
  'nasional-emerging-bulanan',    // <-- tambah
  'abk-crew-penumpang-kedatangan-mingguan',
  'abk-crew-penumpang-kedatangan-bulanan',
  'abk-crew-penumpang-keberangkatan-mingguan',
  'abk-crew-penumpang-keberangkatan-bulanan',
  'skdr-mingguan',
  'skdr-tren-mingguan',
  'skdr-tren-bulanan',
  'karhutla-ispa-bulanan',
  'karhutla-ispa-mingguan',
  'skdr-ispa-mingguan',
  'klinik-kepatuhan-mingguan',
  'klinik-kepatuhan-bulanan',
] as const;

export const KONTEKS_EVENT = [
  'simulasi-wabah-kapal',
  'simulasi-wabah-pesawat',
] as const;

export const KONTEKS_VALID = [...KONTEKS_TREN, ...KONTEKS_BREAKDOWN, ...KONTEKS_EVENT] as const;

export type KonteksTren = (typeof KONTEKS_TREN)[number];
export type KonteksBreakdown = (typeof KONTEKS_BREAKDOWN)[number];
export type KonteksEvent = (typeof KONTEKS_EVENT)[number];
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

export function isKonteksEvent(konteks: KonteksAnalisis): konteks is KonteksEvent {
  return (KONTEKS_EVENT as readonly string[]).includes(konteks);
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
    konteks.startsWith('anopheles-') ||
    konteks.startsWith('global-emerging-') ||
    konteks.startsWith('abk-crew-penumpang-')
  );
}

export function isKonteksSanitasi(konteks: KonteksAnalisis): boolean {
  return (
    konteks === 'tpp-bulanan' || konteks === 'ttu-bulanan' || konteks === 'pab-bulanan' ||
    konteks === 'tpp-mingguan' || konteks === 'ttu-mingguan' || konteks === 'pab-mingguan' ||
    konteks === 'rat-guard-bulanan' || konteks === 'rat-guard-mingguan'
  );
}

export function isKonteksSkdr(konteks: KonteksAnalisis) {
  return konteks === 'skdr-mingguan';
}

export async function ambilDataAnalisisSkdr(
  periodeKey: string,
  wilayahKerja?: string
): Promise<DataAnalisis> {
  const supabase = await createClient();
  const [tahunStr, mingguStr] = periodeKey.replace('W', '').split('-');
  const tahun = Number(tahunStr);
  const minggu = Number(mingguStr);

  const mingguSebelumnya = minggu > 1 ? minggu - 1 : 52;
  const tahunSebelumnya = minggu > 1 ? tahun : tahun - 1;

  async function ambilBaris(t: number, m: number) {
    let q = supabase
      .from('view_skdr_alert_mingguan')
      .select('*')
      .eq('tahun_epid', t)
      .eq('minggu_epid', m);
    if (wilayahKerja) q = q.eq('wilayah_kerja', wilayahKerja);
    const { data } = await q;
    return data ?? [];
  }

  const [dataSaatIni, dataSebelumnya] = await Promise.all([
    ambilBaris(tahun, minggu),
    ambilBaris(tahunSebelumnya, mingguSebelumnya),
  ]);

  const alertSaatIni = dataSaatIni.filter((d) => d.status_alert);
  const totalKasusSaatIni = dataSaatIni.reduce((t, d) => t + (d.jumlah_kasus ?? 0), 0);
  const totalKasusSebelumnya = dataSebelumnya.reduce((t, d) => t + (d.jumlah_kasus ?? 0), 0);

  return {
    labelKonteks: 'SKDR Mingguan',
    labelWilayah: wilayahKerja ?? 'Seluruh wilayah kerja',
    labelPeriodeSaatIni: `Minggu epid ${minggu} tahun ${tahun}`,
    labelPeriodeSebelumnya: `Minggu epid ${mingguSebelumnya} tahun ${tahunSebelumnya}`,
    ringkasanSaatIni: {
      total_penyakit_dipantau: dataSaatIni.length,
      jumlah_alert: alertSaatIni.length,
      total_kasus: totalKasusSaatIni,
    },
    ringkasanSebelumnya: {
      total_penyakit_dipantau: dataSebelumnya.length,
      jumlah_alert: dataSebelumnya.filter((d) => d.status_alert).length,
      total_kasus: totalKasusSebelumnya,
    },
    topKategori: alertSaatIni.map((d) => ({
      kategori: 'penyakit_alert',
      nilai: d.jenis_penyakit ?? `Penyakit #${d.jenis_penyakit_id}`,
      jumlah: d.jumlah_kasus ?? 0,
    })),
  };
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

function agregasiEmergingPerNegara(rows: RingkasanPenyakitEmerging[]): Record<string, number> {
  const petaKasus = new Map<string, number>();
  let totalKematian = 0;
  rows.forEach((r) => {
    petaKasus.set(r.negara, (petaKasus.get(r.negara) ?? 0) + (r.total_kasus ?? 0));
    totalKematian += r.total_kematian ?? 0;
  });
  const hasil = Object.fromEntries(petaKasus.entries());
  hasil['Total Kematian (seluruh negara)'] = totalKematian;
  return hasil;
}

async function ambilGlobalEmergingMingguan(
  tahun: number,
  mgAwal: number,
  mgAkhir: number,
  penyakit: string
): Promise<Record<string, number>> {
  if (mgAkhir < mgAwal) return {};
  const supabase = await createClient();
  const rows = await getRingkasanPenyakitEmerging(supabase, {
    jenis: 'mingguan',
    tahunEpid: tahun,
    penyakit: penyakit as Penyakit,
  });
  const terfilter = rows.filter((r) => (r.minggu_epid ?? 0) >= mgAwal && (r.minggu_epid ?? 0) <= mgAkhir);
  return agregasiEmergingPerNegara(terfilter);
}

async function ambilGlobalEmergingBulanan(
  tahun: number,
  blnAwal: number,
  blnAkhir: number,
  penyakit: string
): Promise<Record<string, number>> {
  if (blnAkhir < blnAwal) return {};
  const supabase = await createClient();
  const rows = await getRingkasanPenyakitEmerging(supabase, {
    jenis: 'bulanan',
    tahunEpid: tahun,
    penyakit: penyakit as Penyakit,
  });
  const terfilter = rows.filter((r) => (r.bulan ?? 0) >= blnAwal && (r.bulan ?? 0) <= blnAkhir);
  return agregasiEmergingPerNegara(terfilter);
}

/**
 * Titik masuk KHUSUS untuk global-emerging-mingguan/bulanan.
 * Wajib pilih 1 penyakit dulu (parameter `penyakit`) -- kalau kosong,
 * lempar error supaya route.ts mengembalikan pesan jelas ke Box AI.
 *
 * tipe="analisis" : KUMULATIF minggu 1 s.d. minggu terpilih (atau
 *   Januari s.d. bulan terpilih), breakdown per negara -- sama pola
 *   dengan ambilDataAnalisisCop/Phqc.
 * tipe="prediksi" : periode TUNGGAL terkini vs periode tunggal
 *   sebelumnya, breakdown per negara -- untuk proyeksi tren ke depan.
 */
async function ambilGlobalEmergingRentang(
  jenis: 'mingguan' | 'bulanan',
  tahun: number,
  awal: number,
  akhir: number,
  mode: 'penyakit' | 'negara',
  nilai: string
): Promise<{ ringkasan: Record<string, number>; topKategori: { kategori: string; nilai: string; jumlah: number }[] }> {
  if (akhir < awal) return { ringkasan: { total_kasus: 0, total_kematian: 0 }, topKategori: [] };

  const supabase = await createClient();
  const rows = await getRingkasanPenyakitEmerging(supabase, {
    jenis,
    tahunEpid: tahun,
    penyakit: mode === 'penyakit' ? (nilai as Penyakit) : undefined,
    negara: mode === 'negara' ? (nilai as Negara) : undefined,
  });

  const kolomPeriode = jenis === 'mingguan' ? 'minggu_epid' : 'bulan';
  const terfilter = rows.filter((r) => {
    const p = (r as any)[kolomPeriode] ?? 0;
    return p >= awal && p <= akhir;
  });

  const petaLain = new Map<string, number>();
  let totalKasus = 0;
  let totalKematian = 0;
  terfilter.forEach((r) => {
    totalKasus += r.total_kasus ?? 0;
    totalKematian += r.total_kematian ?? 0;
    const kunciLain = mode === 'penyakit' ? r.negara : r.penyakit;
    petaLain.set(kunciLain, (petaLain.get(kunciLain) ?? 0) + (r.total_kasus ?? 0));
  });

  const kategoriLabel = mode === 'penyakit' ? 'negara' : 'penyakit';
  const topKategori = Array.from(petaLain.entries())
    .map(([nilai, jumlah]) => ({ kategori: kategoriLabel, nilai, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return { ringkasan: { total_kasus: totalKasus, total_kematian: totalKematian }, topKategori };
}

/**
 * Titik masuk KHUSUS untuk global-emerging-mingguan/bulanan. Wajib pilih
 * 1 nilai (`metrik`) dulu -- otomatis dideteksi apakah itu nama PENYAKIT
 * atau nama NEGARA (dua mode terpisah, toggle dari filter halaman):
 * - metrik = penyakit -> breakdown per NEGARA (topKategori kategori='negara')
 * - metrik = negara   -> breakdown per PENYAKIT (topKategori kategori='penyakit')
 *
 * periodeKey SELALU format rentang ("2026-W1_W24" / "2026-1_7") --
 * dikirim dari page.tsx mengikuti filter Mg/Bulan yang aktif.
 *
 * tipe="analisis" : KUMULATIF dari 1 s.d. periode akhir rentang (mirip
 *   pola vektor-tikus/vektor-diare -- sebelumnya = kumulatif 1 s.d.
 *   sebelum periode awal rentang).
 * tipe="prediksi" : periode TUNGGAL terakhir dalam rentang vs periode
 *   tunggal sebelumnya, untuk proyeksi ke depan.
 */
export async function ambilDataAnalisisGlobalEmerging(
  konteks: 'global-emerging-mingguan' | 'global-emerging-bulanan',
  periodeKey: string,
  metrik: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  if (!metrik) {
    throw new Error('Pilih penyakit atau negara terlebih dahulu untuk menjalankan Analisis/Prediksi AI Global Emerging.');
  }

  const mode: 'penyakit' | 'negara' = (DAFTAR_PENYAKIT as readonly string[]).includes(metrik)
    ? 'penyakit'
    : (DAFTAR_NEGARA as readonly string[]).includes(metrik)
    ? 'negara'
    : (() => {
        throw new Error(`Nilai "${metrik}" tidak dikenal sebagai penyakit maupun negara.`);
      })();

  const labelWilayah =
    mode === 'penyakit'
      ? 'Seluruh negara yang dipantau (breakdown per negara)'
      : 'Seluruh penyakit yang dipantau (breakdown per penyakit)';
  const labelKonteks =
    mode === 'penyakit' ? `Penyakit Infeksi Emerging — ${metrik}` : `Penyakit Infeksi Emerging — Negara: ${metrik}`;
  const isMingguan = konteks === 'global-emerging-mingguan';

  if (isMingguan) {
    const r = isPeriodeRentangMingguan(periodeKey)
      ? parseRentangMingguan(periodeKey)
      : (() => {
          const p = parsePeriodeMingguan(periodeKey);
          return { tahun: p.tahun, mingguAwal: p.minggu, mingguAkhir: p.minggu };
        })();

    if (tipe === 'prediksi') {
      const periodeSaatIni: PeriodeMingguan = { jenis: 'mingguan', tahun: r.tahun, minggu: r.mingguAkhir };
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilGlobalEmergingRentang('mingguan', periodeSaatIni.tahun, periodeSaatIni.minggu, periodeSaatIni.minggu, mode, metrik),
        ambilGlobalEmergingRentang('mingguan', periodeSebelumnya.tahun, periodeSebelumnya.minggu, periodeSebelumnya.minggu, mode, metrik),
      ]);
      return {
        labelKonteks,
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni.ringkasan,
        ringkasanSebelumnya: sebelumnya.ringkasan,
        topKategori: saatIni.topKategori,
      };
    }

    const adaSebelumnya = r.mingguAwal > 1;
    const [saatIni, sebelumnya] = await Promise.all([
      ambilGlobalEmergingRentang('mingguan', r.tahun, r.mingguAwal, r.mingguAkhir, mode, metrik),
      adaSebelumnya
        ? ambilGlobalEmergingRentang('mingguan', r.tahun, 1, r.mingguAwal - 1, mode, metrik)
        : Promise.resolve({ ringkasan: { total_kasus: 0, total_kematian: 0 }, topKategori: [] }),
    ]);
    return {
      labelKonteks,
      labelWilayah,
      labelPeriodeSaatIni: labelRentangMingguan(r),
      labelPeriodeSebelumnya: adaSebelumnya
        ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
        : 'Tidak ada data sebelum minggu ke-1',
      ringkasanSaatIni: saatIni.ringkasan,
      ringkasanSebelumnya: sebelumnya.ringkasan,
      topKategori: saatIni.topKategori,
    };
  }

  // bulanan
  const r = isPeriodeRentangBulanan(periodeKey)
    ? parseRentangBulanan(periodeKey)
    : (() => {
        const p = parsePeriodeBulanan(periodeKey);
        return { tahun: p.tahun, bulanAwal: p.bulan, bulanAkhir: p.bulan };
      })();

  if (tipe === 'prediksi') {
    const periodeSaatIni: PeriodeBulanan = { jenis: 'bulanan', tahun: r.tahun, bulan: r.bulanAkhir };
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilGlobalEmergingRentang('bulanan', periodeSaatIni.tahun, periodeSaatIni.bulan, periodeSaatIni.bulan, mode, metrik),
      ambilGlobalEmergingRentang('bulanan', periodeSebelumnya.tahun, periodeSebelumnya.bulan, periodeSebelumnya.bulan, mode, metrik),
    ]);
    return {
      labelKonteks,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni.ringkasan,
      ringkasanSebelumnya: sebelumnya.ringkasan,
      topKategori: saatIni.topKategori,
    };
  }

  const adaSebelumnya = r.bulanAwal > 1;
  const [saatIni, sebelumnya] = await Promise.all([
    ambilGlobalEmergingRentang('bulanan', r.tahun, r.bulanAwal, r.bulanAkhir, mode, metrik),
    adaSebelumnya
      ? ambilGlobalEmergingRentang('bulanan', r.tahun, 1, r.bulanAwal - 1, mode, metrik)
      : Promise.resolve({ ringkasan: { total_kasus: 0, total_kematian: 0 }, topKategori: [] }),
  ]);
  return {
    labelKonteks,
    labelWilayah,
    labelPeriodeSaatIni: labelRentangBulanan(r),
    labelPeriodeSebelumnya: adaSebelumnya
      ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
      : 'Tidak ada data sebelum bulan pertama',
    ringkasanSaatIni: saatIni.ringkasan,
    ringkasanSebelumnya: sebelumnya.ringkasan,
    topKategori: saatIni.topKategori,
  };
}

const DAFTAR_PENYAKIT_NASIONAL = ['Leptospirosis', 'Mpox', 'Polio', 'Legionellosis', 'Hantavirus', 'Covid-19'] as const;

function isPenyakitNasionalValid(nilai: unknown): nilai is (typeof DAFTAR_PENYAKIT_NASIONAL)[number] {
  return typeof nilai === 'string' && (DAFTAR_PENYAKIT_NASIONAL as readonly string[]).includes(nilai);
}

// GSS nasional cuma punya kolom Mg1-Mg53 (tidak ada kolom bulan tersimpan),
// jadi konversi minggu->bulan dilakukan di sini saat agregasi bulanan.
const BATAS_BULAN_NASIONAL = [
  { bulan: 1, awal: 1, akhir: 4 }, { bulan: 2, awal: 5, akhir: 8 }, { bulan: 3, awal: 9, akhir: 13 },
  { bulan: 4, awal: 14, akhir: 17 }, { bulan: 5, awal: 18, akhir: 21 }, { bulan: 6, awal: 22, akhir: 26 },
  { bulan: 7, awal: 27, akhir: 30 }, { bulan: 8, awal: 31, akhir: 35 }, { bulan: 9, awal: 36, akhir: 39 },
  { bulan: 10, awal: 40, akhir: 43 }, { bulan: 11, awal: 44, akhir: 48 }, { bulan: 12, awal: 49, akhir: 53 },
];

function mingguKeBulanNasional(minggu: number): number {
  return BATAS_BULAN_NASIONAL.find((b) => minggu >= b.awal && minggu <= b.akhir)?.bulan ?? 12;
}

async function ambilNasionalEmergingRentang(
  jenis: 'mingguan' | 'bulanan',
  tahun: number,
  awal: number,
  akhir: number,
  penyakit: string
): Promise<{ ringkasan: Record<string, number>; topKategori: { kategori: string; nilai: string; jumlah: number }[] }> {
  if (akhir < awal) return { ringkasan: { total_kasus: 0, total_kematian: 0 }, topKategori: [] };

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('laporan_penyakit_nasional')
    .select('propinsi, minggu_epid, jumlah_kasus, jumlah_kematian')
    .eq('penyakit', penyakit)
    .eq('tahun_epid', tahun);

  if (error) throw new Error(`Gagal mengambil data nasional emerging: ${error.message}`);

  const terfilter = (rows ?? []).filter((r) => {
    const p = jenis === 'mingguan' ? r.minggu_epid : mingguKeBulanNasional(r.minggu_epid);
    return p >= awal && p <= akhir;
  });

  const petaPropinsi = new Map<string, number>();
  let totalKasus = 0;
  let totalKematian = 0;
  terfilter.forEach((r) => {
    totalKasus += r.jumlah_kasus ?? 0;
    totalKematian += r.jumlah_kematian ?? 0;
    petaPropinsi.set(r.propinsi, (petaPropinsi.get(r.propinsi) ?? 0) + (r.jumlah_kasus ?? 0));
  });

  const topKategori = Array.from(petaPropinsi.entries())
    .map(([nilai, jumlah]) => ({ kategori: 'propinsi', nilai, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return { ringkasan: { total_kasus: totalKasus, total_kematian: totalKematian }, topKategori };
}

export async function ambilDataAnalisisNasionalEmerging(
  konteks: 'nasional-emerging-mingguan' | 'nasional-emerging-bulanan',
  periodeKey: string,
  metrik: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  if (!metrik || !isPenyakitNasionalValid(metrik)) {
    throw new Error('Pilih penyakit terlebih dahulu untuk menjalankan Analisis/Prediksi AI Nasional Emerging.');
  }

  const labelWilayah = 'Seluruh propinsi Indonesia (breakdown per propinsi)';
  const labelKonteks = `Penyakit Infeksi Emerging Nasional — ${metrik}`;
  const isMingguan = konteks === 'nasional-emerging-mingguan';

  if (isMingguan) {
    const r = isPeriodeRentangMingguan(periodeKey)
      ? parseRentangMingguan(periodeKey)
      : (() => {
          const p = parsePeriodeMingguan(periodeKey);
          return { tahun: p.tahun, mingguAwal: p.minggu, mingguAkhir: p.minggu };
        })();

    if (tipe === 'prediksi') {
      const periodeSaatIni: PeriodeMingguan = { jenis: 'mingguan', tahun: r.tahun, minggu: r.mingguAkhir };
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilNasionalEmergingRentang('mingguan', periodeSaatIni.tahun, periodeSaatIni.minggu, periodeSaatIni.minggu, metrik),
        ambilNasionalEmergingRentang('mingguan', periodeSebelumnya.tahun, periodeSebelumnya.minggu, periodeSebelumnya.minggu, metrik),
      ]);
      return {
        labelKonteks, labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni.ringkasan, ringkasanSebelumnya: sebelumnya.ringkasan,
        topKategori: saatIni.topKategori,
      };
    }

    const adaSebelumnya = r.mingguAwal > 1;
    const [saatIni, sebelumnya] = await Promise.all([
      ambilNasionalEmergingRentang('mingguan', r.tahun, r.mingguAwal, r.mingguAkhir, metrik),
      adaSebelumnya
        ? ambilNasionalEmergingRentang('mingguan', r.tahun, 1, r.mingguAwal - 1, metrik)
        : Promise.resolve({ ringkasan: { total_kasus: 0, total_kematian: 0 }, topKategori: [] }),
    ]);
    return {
      labelKonteks, labelWilayah,
      labelPeriodeSaatIni: labelRentangMingguan(r),
      labelPeriodeSebelumnya: adaSebelumnya
        ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
        : 'Tidak ada data sebelum minggu ke-1',
      ringkasanSaatIni: saatIni.ringkasan, ringkasanSebelumnya: sebelumnya.ringkasan,
      topKategori: saatIni.topKategori,
    };
  }

  const r = isPeriodeRentangBulanan(periodeKey)
    ? parseRentangBulanan(periodeKey)
    : (() => {
        const p = parsePeriodeBulanan(periodeKey);
        return { tahun: p.tahun, bulanAwal: p.bulan, bulanAkhir: p.bulan };
      })();

  if (tipe === 'prediksi') {
    const periodeSaatIni: PeriodeBulanan = { jenis: 'bulanan', tahun: r.tahun, bulan: r.bulanAkhir };
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilNasionalEmergingRentang('bulanan', periodeSaatIni.tahun, periodeSaatIni.bulan, periodeSaatIni.bulan, metrik),
      ambilNasionalEmergingRentang('bulanan', periodeSebelumnya.tahun, periodeSebelumnya.bulan, periodeSebelumnya.bulan, metrik),
    ]);
    return {
      labelKonteks, labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni.ringkasan, ringkasanSebelumnya: sebelumnya.ringkasan,
      topKategori: saatIni.topKategori,
    };
  }

  const adaSebelumnya = r.bulanAwal > 1;
  const [saatIni, sebelumnya] = await Promise.all([
    ambilNasionalEmergingRentang('bulanan', r.tahun, r.bulanAwal, r.bulanAkhir, metrik),
    adaSebelumnya
      ? ambilNasionalEmergingRentang('bulanan', r.tahun, 1, r.bulanAwal - 1, metrik)
      : Promise.resolve({ ringkasan: { total_kasus: 0, total_kematian: 0 }, topKategori: [] }),
  ]);
  return {
    labelKonteks, labelWilayah,
    labelPeriodeSaatIni: labelRentangBulanan(r),
    labelPeriodeSebelumnya: adaSebelumnya
      ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
      : 'Tidak ada data sebelum bulan pertama',
    ringkasanSaatIni: saatIni.ringkasan, ringkasanSebelumnya: sebelumnya.ringkasan,
    topKategori: saatIni.topKategori,
  };
}

async function ambilAbkKapalRentang(
  arah: 'kedatangan' | 'keberangkatan',
  granularitas: 'mingguan' | 'bulanan',
  tahun: number,
  awal: number,
  akhir: number
): Promise<Record<string, number>> {
  const baris =
    arah === 'kedatangan'
      ? granularitas === 'mingguan'
        ? await getRingkasanMingguan('cop', tahun)
        : await getRingkasanBulanan('cop', tahun)
      : granularitas === 'mingguan'
        ? await getRingkasanMingguan('phqc', tahun)
        : await getRingkasanBulanan('phqc', tahun);

  const kolomPeriode = granularitas === 'mingguan' ? 'minggu_epid' : 'bulan';
  const terfilter = (baris as any[]).filter((b) => b[kolomPeriode] >= awal && b[kolomPeriode] <= akhir);

  if (arah === 'kedatangan') {
    // COP (kedatangan) tidak punya kolom penumpang -- kapal dari luar
    // negeri yang diawasi hanya membawa ABK, bukan penumpang.
    const jumlah = jumlahkanRentang(terfilter, undefined, ['total_abk'] as any);
    return { abk_kapal: jumlah.total_abk ?? 0, penumpang_kapal: 0 };
  }
  const jumlah = jumlahkanRentang(terfilter, undefined, ['total_abk', 'total_penumpang'] as any);
  return { abk_kapal: jumlah.total_abk ?? 0, penumpang_kapal: jumlah.total_penumpang ?? 0 };
}

async function ambilPesawatCrewPenumpangRentang(
  arah: 'kedatangan' | 'keberangkatan',
  granularitas: 'mingguan' | 'bulanan',
  tahun: number,
  awal: number,
  akhir: number
): Promise<Record<string, number>> {
  // ASUMSI: getRingkasanPesawatMingguan/Bulanan tanpa kodeWilker
  // mengembalikan gabungan SEMUA bandara (bukan error/kosong). Kalau
  // ternyata wajib isi kodeWilker, kabari saya -- perlu ditambah
  // agregasi manual per-wilker seperti fungsi lain di file ini.
  const baris = granularitas === 'mingguan'
    ? await getRingkasanPesawatMingguan({ tahun, mgDari: awal, mgSampai: akhir })
    : await getRingkasanPesawatBulanan({
        tahun,
        bulanDari: `${tahun}-${String(awal).padStart(2, '0')}`,
        bulanSampai: `${tahun}-${String(akhir).padStart(2, '0')}`,
      });

  const kolomCrew = arah === 'kedatangan' ? 'crew_datang' : 'crew_berangkat';
  const kolomPenumpang = arah === 'kedatangan' ? 'penumpang_datang' : 'penumpang_berangkat';
  const jumlah = jumlahkanRentang(baris as any[], undefined, [kolomCrew, kolomPenumpang] as any);
  return { crew_pesawat: jumlah[kolomCrew] ?? 0, penumpang_pesawat: jumlah[kolomPenumpang] ?? 0 };
}

async function ambilAbkCrewPenumpangRentang(
  granularitas: 'mingguan' | 'bulanan',
  tahun: number,
  awal: number,
  akhir: number,
  arah: 'kedatangan' | 'keberangkatan'
): Promise<Record<string, number>> {
  const [kapal, pesawat] = await Promise.all([
    ambilAbkKapalRentang(arah, granularitas, tahun, awal, akhir),
    ambilPesawatCrewPenumpangRentang(arah, granularitas, tahun, awal, akhir),
  ]);
  return { ...kapal, ...pesawat };
}

/**
 * Titik masuk KHUSUS untuk abk-crew-penumpang-kedatangan/keberangkatan
 * -mingguan/bulanan. Sama persis pola ambilDataAnalisisNasionalEmerging,
 * TAPI tanpa parameter `metrik` (modul ini tidak butuh pilih kategori
 * apa pun -- selalu gabungan total 4 komponen) dan tanpa wilayahKerja
 * (modul ini rekap seluruh BKK, bukan per wilayah kerja tunggal).
 */
export async function ambilDataAnalisisAbkCrewPenumpang(
  konteks:
    | 'abk-crew-penumpang-kedatangan-mingguan'
    | 'abk-crew-penumpang-kedatangan-bulanan'
    | 'abk-crew-penumpang-keberangkatan-mingguan'
    | 'abk-crew-penumpang-keberangkatan-bulanan',
  periodeKey: string,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const arah: 'kedatangan' | 'keberangkatan' = konteks.includes('kedatangan') ? 'kedatangan' : 'keberangkatan';
  const isMingguan = konteks.endsWith('-mingguan');
  const labelWilayah = 'Seluruh wilayah kerja BKK Kelas I Samarinda (gabungan kapal & pesawat)';
  const labelKonteks =
    arah === 'kedatangan'
      ? 'ABK Kapal, Crew Pesawat & Penumpang Pesawat — Kedatangan'
      : 'ABK Kapal, Penumpang Kapal, Crew Pesawat & Penumpang Pesawat — Keberangkatan';

  if (isMingguan) {
    const r = isPeriodeRentangMingguan(periodeKey)
      ? parseRentangMingguan(periodeKey)
      : (() => {
          const p = parsePeriodeMingguan(periodeKey);
          return { tahun: p.tahun, mingguAwal: p.minggu, mingguAkhir: p.minggu };
        })();

    if (tipe === 'prediksi') {
      const periodeSaatIni: PeriodeMingguan = { jenis: 'mingguan', tahun: r.tahun, minggu: r.mingguAkhir };
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilAbkCrewPenumpangRentang('mingguan', periodeSaatIni.tahun, periodeSaatIni.minggu, periodeSaatIni.minggu, arah),
        ambilAbkCrewPenumpangRentang('mingguan', periodeSebelumnya.tahun, periodeSebelumnya.minggu, periodeSebelumnya.minggu, arah),
      ]);
      return {
        labelKonteks, labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni, ringkasanSebelumnya: sebelumnya,
        topKategori: [],
      };
    }

    const adaSebelumnya = r.mingguAwal > 1;
    const [saatIni, sebelumnya] = await Promise.all([
      ambilAbkCrewPenumpangRentang('mingguan', r.tahun, r.mingguAwal, r.mingguAkhir, arah),
      adaSebelumnya
        ? ambilAbkCrewPenumpangRentang('mingguan', r.tahun, 1, r.mingguAwal - 1, arah)
        : Promise.resolve({ abk_kapal: 0, penumpang_kapal: 0, crew_pesawat: 0, penumpang_pesawat: 0 }),
    ]);
    return {
      labelKonteks, labelWilayah,
      labelPeriodeSaatIni: labelRentangMingguan(r),
      labelPeriodeSebelumnya: adaSebelumnya
        ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
        : 'Tidak ada data sebelum minggu ke-1',
      ringkasanSaatIni: saatIni, ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  const r = isPeriodeRentangBulanan(periodeKey)
    ? parseRentangBulanan(periodeKey)
    : (() => {
        const p = parsePeriodeBulanan(periodeKey);
        return { tahun: p.tahun, bulanAwal: p.bulan, bulanAkhir: p.bulan };
      })();

  if (tipe === 'prediksi') {
    const periodeSaatIni: PeriodeBulanan = { jenis: 'bulanan', tahun: r.tahun, bulan: r.bulanAkhir };
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilAbkCrewPenumpangRentang('bulanan', periodeSaatIni.tahun, periodeSaatIni.bulan, periodeSaatIni.bulan, arah),
      ambilAbkCrewPenumpangRentang('bulanan', periodeSebelumnya.tahun, periodeSebelumnya.bulan, periodeSebelumnya.bulan, arah),
    ]);
    return {
      labelKonteks, labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni, ringkasanSebelumnya: sebelumnya,
      topKategori: [],
    };
  }

  const adaSebelumnya = r.bulanAwal > 1;
  const [saatIni, sebelumnya] = await Promise.all([
    ambilAbkCrewPenumpangRentang('bulanan', r.tahun, r.bulanAwal, r.bulanAkhir, arah),
    adaSebelumnya
      ? ambilAbkCrewPenumpangRentang('bulanan', r.tahun, 1, r.bulanAwal - 1, arah)
      : Promise.resolve({ abk_kapal: 0, penumpang_kapal: 0, crew_pesawat: 0, penumpang_pesawat: 0 }),
  ]);
  return {
    labelKonteks, labelWilayah,
    labelPeriodeSaatIni: labelRentangBulanan(r),
    labelPeriodeSebelumnya: adaSebelumnya
      ? `Januari s.d. bulan sebelum rentang ini, tahun ${r.tahun}`
      : 'Tidak ada data sebelum bulan pertama',
    ringkasanSaatIni: saatIni, ringkasanSebelumnya: sebelumnya,
    topKategori: [],
  };
}

export interface DataSimulasiWabah {
  labelKonteks: string;
  labelWilayah: string;
  namaEntitas: string; // nama kapal / nomor penerbangan
  kategoriPenyakit: string;
  rEfektif: number;
  estimasiKontakBerisikoTerinfeksi: number;
  rekomendasiRulesBased: string;
}

export async function ambilDataSimulasiWabahKapal(simulasiId: string): Promise<DataSimulasiWabah> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("simulasi_wabah_kapal")
    .select("*, referensi_parameter_penyakit(kategori)")
    .eq("id", simulasiId)
    .single();

  if (error || !data) throw new Error("Data simulasi kapal tidak ditemukan");

  return {
    labelKonteks: "Simulasi Wabah Kapal",
    labelWilayah: data.wilayah_kerja,
    namaEntitas: data.nama_kapal,
    kategoriPenyakit: (data.referensi_parameter_penyakit as any)?.kategori ?? "Tidak diketahui",
    rEfektif: data.r_efektif_kapal ?? 0,
    estimasiKontakBerisikoTerinfeksi: data.estimasi_kasus_impor_kota ?? 0,
    rekomendasiRulesBased: data.rekomendasi_kebijakan ?? "",
  };
}

export async function ambilDataSimulasiWabahPesawat(simulasiId: string): Promise<DataSimulasiWabah> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("simulasi_wabah_pesawat")
    .select("*, referensi_parameter_penyakit(kategori)")
    .eq("id", simulasiId)
    .single();

  if (error || !data) throw new Error("Data simulasi pesawat tidak ditemukan");

  return {
    labelKonteks: "Simulasi Wabah Pesawat",
    labelWilayah: data.kode_wilker,
    namaEntitas: data.nomor_penerbangan ?? "Tanpa nomor",
    kategoriPenyakit: (data.referensi_parameter_penyakit as any)?.kategori ?? "Tidak diketahui",
    rEfektif: 0, // pesawat tidak pakai R efektif, bisa dikosongkan atau diisi field lain
    estimasiKontakBerisikoTerinfeksi: data.estimasi_kontak_erat ?? 0,
    rekomendasiRulesBased: data.rekomendasi_kebijakan ?? "",
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
  'phqc-daerah-tujuan': 'pelabuhan_tujuan',
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
  'phqc-daerah-tujuan': 'phqc',
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
  'phqc-daerah-tujuan': 'Daerah Tujuan — Pelabuhan Tujuan (Kegiatan PHQC)',
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
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi' = 'analisis'
): Promise<DataBreakdownAnalisis> {
  if (konteks === 'phqc-pelabuhan-mingguan' || konteks === 'phqc-pelabuhan-bulanan') {
    return ambilDataBreakdownPelabuhanPhqc(periodeKey, wilayahKerja);
  }

  // KUMULATIF khusus phqc-daerah-asal/phqc-daerah-tujuan untuk tipe="analisis"
  // (sama seperti pola kumulatif di ambilDataAnalisisPhqc/ambilDataAnalisisSanitasi) --
  // "prediksi" TETAP periode tunggal seperti semula, tidak berubah.
  if (
    (konteks === 'phqc-daerah-asal' || konteks === 'phqc-daerah-tujuan') &&
    tipe === 'analisis'
  ) {
    const kategori = konteks === 'phqc-daerah-asal' ? 'pelabuhan_kedatangan' : 'pelabuhan_tujuan';
    const labelWilayah = wilayahKerja
      ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
      : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
    const wilayahUntukQuery = resolveWilayahPhqcDb(wilayahKerja);
    const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);

    if (isMingguan) {
      const p = parsePeriodeMingguan(periodeKey);
      const semua = await (getKategoriBreakdown as any)('phqc', 'mingguan', {
        tahun_epid: p.tahun,
        kategori,
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
      });
      const terfilter = (semua as { minggu_epid: number; nilai: string; jumlah: number }[]).filter(
        (b) => b.minggu_epid >= 1 && b.minggu_epid <= p.minggu
      );
      const peta = new Map<string, number>();
      terfilter.forEach((b) => peta.set(b.nilai, (peta.get(b.nilai) ?? 0) + b.jumlah));
      const breakdown = Array.from(peta.entries())
        .map(([nilai, jumlah]) => ({ nilai, jumlah }))
        .sort((a, b) => b.jumlah - a.jumlah);

      const ringkasan = await ambilPhqcKumulatifMingguan(p.tahun, p.minggu, wilayahKerja);

      return {
        labelKonteks: LABEL_PER_KONTEKS_BREAKDOWN[konteks],
        labelWilayah,
        labelPeriode: `Minggu epidemiologi 1 s.d. ${p.minggu} tahun ${p.tahun} (kumulatif)`,
        totalKapal: ringkasan.jumlah_kapal ?? 0,
        breakdown,
      };
    }

    const p = parsePeriodeBulanan(periodeKey);
    const semua = await (getKategoriBreakdown as any)('phqc', 'bulanan', {
      tahun: p.tahun,
      kategori,
      ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
    });
    const terfilter = (semua as { bulan: number; nilai: string; jumlah: number }[]).filter(
      (b) => b.bulan >= 1 && b.bulan <= p.bulan
    );
    const peta = new Map<string, number>();
    terfilter.forEach((b) => peta.set(b.nilai, (peta.get(b.nilai) ?? 0) + b.jumlah));
    const breakdown = Array.from(peta.entries())
      .map(([nilai, jumlah]) => ({ nilai, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    const ringkasan = await ambilPhqcKumulatifBulanan(p.tahun, p.bulan, wilayahKerja);

    return {
      labelKonteks: LABEL_PER_KONTEKS_BREAKDOWN[konteks],
      labelWilayah,
      labelPeriode: `Januari s.d. ${labelPeriodeBulanan(p)} (kumulatif)`,
      totalKapal: ringkasan.jumlah_kapal ?? 0,
      breakdown,
    };
  }

  const labelWilayah = wilayahKerja
    ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
    : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
  const kategori = KATEGORI_PER_KONTEKS_BREAKDOWN[konteks];
  const tabel = TABEL_PER_KONTEKS_BREAKDOWN[konteks];
  const wilayahUntukQuery = tabel === 'phqc' ? resolveWilayahPhqcDb(wilayahKerja) : wilayahKerja;
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);

  // cop-per-wilker SENGAJA dikecualikan dari kumulatif -- itu memang
  // didesain selalu snapshot 1 minggu terkini, tidak ikut filter
  // rentang (lihat dokumentasi Section 4 di app/cop/page.tsx).
  const pakaiKumulatif = tipe === 'analisis' && konteks !== 'cop-per-wilker';

  let labelPeriode: string;
  let baris: { kategori: string; nilai: string; jumlah: number }[];
  let totalKapal: number;

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);

    if (pakaiKumulatif) {
      const semua: any[] = await (getKategoriBreakdown as any)(tabel, 'mingguan', {
        tahun_epid: p.tahun,
        kategori,
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
      });
      baris = semua.filter((b) => b.minggu_epid >= 1 && b.minggu_epid <= p.minggu);
      labelPeriode = `Minggu epidemiologi 1 s.d. ${p.minggu} tahun ${p.tahun} (kumulatif)`;
      const ringkasan =
        tabel === 'cop'
          ? await ambilCopKumulatifMingguan(p.tahun, p.minggu, wilayahKerja)
          : await ambilPhqcKumulatifMingguan(p.tahun, p.minggu, wilayahKerja);
      totalKapal = ringkasan.jumlah_kapal ?? 0;
    } else {
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
    }
  } else {
    const p = parsePeriodeBulanan(periodeKey);

    if (pakaiKumulatif) {
      const semua: any[] = await (getKategoriBreakdown as any)(tabel, 'bulanan', {
        tahun: p.tahun,
        kategori,
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
      });
      baris = semua.filter((b) => b.bulan >= 1 && b.bulan <= p.bulan);
      labelPeriode = `Januari s.d. ${labelPeriodeBulanan(p)} (kumulatif)`;
      const ringkasan =
        tabel === 'cop'
          ? await ambilCopKumulatifBulanan(p.tahun, p.bulan, wilayahKerja)
          : await ambilPhqcKumulatifBulanan(p.tahun, p.bulan, wilayahKerja);
      totalKapal = ringkasan.jumlah_kapal ?? 0;
    } else {
      labelPeriode = labelPeriodeBulanan(p);
      baris = await (getKategoriBreakdown as any)(tabel, 'bulanan', {
        tahun: p.tahun,
        bulan: p.bulan,
        kategori,
        ...(wilayahUntukQuery ? { wilayah_kerja: wilayahUntukQuery } : {}),
      });
      const ringkasan =
        tabel === 'cop' ? await ambilCopBulanan(p, wilayahKerja) : await ambilPhqcBulanan(p, wilayahKerja);
      totalKapal = ringkasan.jumlah_kapal ?? 0;
    }
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

const RENTANG_BULAN_SKDR: { label: string; dari: number; sampai: number }[] = [
  { label: 'Januari', dari: 1, sampai: 4 }, { label: 'Februari', dari: 5, sampai: 8 },
  { label: 'Maret', dari: 9, sampai: 13 }, { label: 'April', dari: 14, sampai: 17 },
  { label: 'Mei', dari: 18, sampai: 21 }, { label: 'Juni', dari: 22, sampai: 26 },
  { label: 'Juli', dari: 27, sampai: 30 }, { label: 'Agustus', dari: 31, sampai: 35 },
  { label: 'September', dari: 36, sampai: 39 }, { label: 'Oktober', dari: 40, sampai: 43 },
  { label: 'November', dari: 44, sampai: 48 }, { label: 'Desember', dari: 49, sampai: 53 },
];

export function isKonteksSkdrTren(konteks: string) {
  return konteks === 'skdr-tren-mingguan' || konteks === 'skdr-tren-bulanan';
}

export async function ambilDataAnalisisSkdrTren(
  konteks: string,
  periodeKey: string,
  wilayahKerja: string | undefined,
  jenisPenyakitId: number
): Promise<DataAnalisis> {
  const supabase = await createClient();

  const { data: penyakitRow } = await supabase
    .from('skdr_jenis_penyakit')
    .select('jenis_penyakit')
    .eq('nomor', jenisPenyakitId)
    .single();
  const namaPenyakit = penyakitRow?.jenis_penyakit ?? `Penyakit #${jenisPenyakitId}`;

  const tahunMatch = periodeKey.match(/^(\d+)-/);
  const tahun = tahunMatch ? Number(tahunMatch[1]) : new Date().getFullYear();

  let mgDari: number, mgSampai: number, labelSaatIni: string;
  if (konteks === 'skdr-tren-bulanan') {
    const m = periodeKey.match(/M(\d+)_M(\d+)/);
    const bulanDariIdx = m ? Number(m[1]) - 1 : 0;
    const bulanSampaiIdx = m ? Number(m[2]) - 1 : 11;
    mgDari = RENTANG_BULAN_SKDR[bulanDariIdx].dari;
    mgSampai = RENTANG_BULAN_SKDR[bulanSampaiIdx].sampai;
    labelSaatIni = `${RENTANG_BULAN_SKDR[bulanDariIdx].label}-${RENTANG_BULAN_SKDR[bulanSampaiIdx].label} ${tahun}`;
  } else {
    const m = periodeKey.match(/W(\d+)_W(\d+)/);
    mgDari = m ? Number(m[1]) : 1;
    mgSampai = m ? Number(m[2]) : 53;
    labelSaatIni = `Minggu ${mgDari}-${mgSampai} tahun ${tahun}`;
  }

  const panjang = mgSampai - mgDari + 1;
  const mgDariSebelumnya = Math.max(1, mgDari - panjang);
  const mgSampaiSebelumnya = mgDari - 1;

  async function ambilRows(dari: number, sampai: number) {
    if (sampai < dari) return [];
    let q = supabase
      .from('skdr_mingguan')
      .select('minggu_epid, jumlah_kasus')
      .eq('tahun_epid', tahun)
      .eq('jenis_penyakit_id', jenisPenyakitId)
      .gte('minggu_epid', dari)
      .lte('minggu_epid', sampai);
    if (wilayahKerja) q = q.eq('wilayah_kerja', wilayahKerja);
    const { data } = await q;
    return data ?? [];
  }

  const [rowsSaatIni, rowsSebelumnya] = await Promise.all([
    ambilRows(mgDari, mgSampai),
    ambilRows(mgDariSebelumnya, mgSampaiSebelumnya),
  ]);

  const totalSaatIni = rowsSaatIni.reduce((t, r) => t + (r.jumlah_kasus ?? 0), 0);
  const totalSebelumnya = rowsSebelumnya.reduce((t, r) => t + (r.jumlah_kasus ?? 0), 0);

  const perMinggu = new Map<number, number>();
  rowsSaatIni.forEach((r) => perMinggu.set(r.minggu_epid, (perMinggu.get(r.minggu_epid) ?? 0) + (r.jumlah_kasus ?? 0)));

  return {
    labelKonteks: `SKDR Tren — ${namaPenyakit}`,
    labelWilayah: wilayahKerja ?? 'Seluruh wilayah kerja',
    labelPeriodeSaatIni: labelSaatIni,
    labelPeriodeSebelumnya: `Minggu ${mgDariSebelumnya}-${mgSampaiSebelumnya} tahun ${tahun}`,
    ringkasanSaatIni: {
      total_kasus: totalSaatIni,
      rata_rata_per_minggu: panjang > 0 ? Math.round((totalSaatIni / panjang) * 100) / 100 : 0,
    },
    ringkasanSebelumnya: {
      total_kasus: totalSebelumnya,
      rata_rata_per_minggu: panjang > 0 ? Math.round((totalSebelumnya / panjang) * 100) / 100 : 0,
    },
    topKategori: Array.from(perMinggu.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([minggu, jumlah]) => ({ kategori: 'minggu', nilai: `Mg ${minggu}`, jumlah })),
  };
}

// ============================================================
// TEMPEL KE lib/ai/data.ts
// ============================================================
//
// 1. Import yang dibutuhkan (sesuaikan path kalau beda):
//    import { ambilPerbandinganIspaHotspot } from '@/lib/supabase/queries-karhutla-server';
//    import { DAFTAR_WILAYAH_KARHUTLA } from '@/lib/karhutla/constants';
//
// 2. Tambahkan 'karhutla-ispa-mingguan' dan 'karhutla-ispa-bulanan' ke:
//    - array KONTEKS_TREN (atau array konteks trend/breakdown yang relevan)
//    - array KONTEKS_PREDIKSI_NON_VEKTOR
//
// 3. Tempel fungsi di bawah ini di lib/ai/data.ts

const NAMA_BULAN_KARHUTLA = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function labelWilayahKarhutla(wilayahKeys: string[]): string {
  if (wilayahKeys.length === 0) return 'Seluruh wilayah kerja';
  const label = wilayahKeys.map((key) => {
    const entri = DAFTAR_WILAYAH_KARHUTLA.find((w) =>
      w.zona ? `${w.kode_wilker}::${w.zona}` === key : w.kode_wilker === key
    );
    return entri?.label ?? key;
  });
  return label.join(', ');
}

export async function ambilDataAnalisisKarhutlaIspaHotspot(
  konteks: string,
  periodeKey: string,
  wilayahKerja: string | undefined
): Promise<DataAnalisis> {
  const isMingguan = konteks === 'karhutla-ispa-mingguan';

  const tahunMatch = periodeKey.match(/^(\d+)-/);
  const tahun = tahunMatch ? Number(tahunMatch[1]) : new Date().getFullYear();

  let periodeDari: number, periodeSampai: number, labelSaatIni: string;
  if (isMingguan) {
    const m = periodeKey.match(/W(\d+)_W(\d+)/);
    periodeDari = m ? Number(m[1]) : 1;
    periodeSampai = m ? Number(m[2]) : 53;
    labelSaatIni = `Minggu ${periodeDari}-${periodeSampai} tahun ${tahun}`;
  } else {
    const m = periodeKey.match(/M(\d+)_M(\d+)/);
    periodeDari = m ? Number(m[1]) : 1;
    periodeSampai = m ? Number(m[2]) : 12;
    labelSaatIni = `Bulan ${NAMA_BULAN_KARHUTLA[periodeDari - 1] ?? '-'}-${NAMA_BULAN_KARHUTLA[periodeSampai - 1] ?? '-'} ${tahun}`;
  }

  const panjang = periodeSampai - periodeDari + 1;
  const periodeDariSebelumnya = Math.max(1, periodeDari - panjang);
  const periodeSampaiSebelumnya = periodeDari - 1;

  // wilayahKerja dikirim sebagai string gabungan koma dari BoxAnalisisAI/BoxPrediksiAI
  // (mis. "WK01,WK02"), atau undefined/'Semua' berarti seluruh wilayah kerja.
  const wilayahKeys =
    wilayahKerja && wilayahKerja !== 'Semua'
      ? wilayahKerja.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  const granularitas = isMingguan ? 'mingguan' : 'bulanan';

  const [dataSaatIni, dataSebelumnya] = await Promise.all([
    ambilPerbandinganIspaHotspot({ granularitas, tahun, periodeAwal: periodeDari, periodeAkhir: periodeSampai, wilayahKeys }),
    periodeSampaiSebelumnya >= periodeDariSebelumnya
      ? ambilPerbandinganIspaHotspot({ granularitas, tahun, periodeAwal: periodeDariSebelumnya, periodeAkhir: periodeSampaiSebelumnya, wilayahKeys })
      : Promise.resolve([]),
  ]);

  const totalKasusSaatIni = dataSaatIni.reduce((t, d) => t + d.totalKasusIspa, 0);
  const totalHotspotSaatIni = dataSaatIni.reduce((t, d) => t + d.jumlahHotspot, 0);
  const totalKasusSebelumnya = dataSebelumnya.reduce((t, d) => t + d.totalKasusIspa, 0);
  const totalHotspotSebelumnya = dataSebelumnya.reduce((t, d) => t + d.jumlahHotspot, 0);

  const topKategori: DataAnalisis['topKategori'] = [];
  dataSaatIni.forEach((d) => {
    topKategori.push({ kategori: 'kasus_ispa', nilai: d.periodeLabel, jumlah: d.totalKasusIspa });
    topKategori.push({ kategori: 'hotspot', nilai: d.periodeLabel, jumlah: d.jumlahHotspot });
  });

  return {
    labelKonteks: 'Karhutla — Kasus ISPA vs Titik Panas',
    labelWilayah: labelWilayahKarhutla(wilayahKeys),
    labelPeriodeSaatIni: labelSaatIni,
    labelPeriodeSebelumnya: isMingguan
      ? `Minggu ${periodeDariSebelumnya}-${periodeSampaiSebelumnya} tahun ${tahun}`
      : `Bulan ${NAMA_BULAN_KARHUTLA[periodeDariSebelumnya - 1] ?? '-'}-${NAMA_BULAN_KARHUTLA[periodeSampaiSebelumnya - 1] ?? '-'} ${tahun}`,
    ringkasanSaatIni: {
      total_kasus_ispa: totalKasusSaatIni,
      jumlah_hotspot: totalHotspotSaatIni,
      rata_rata_kasus_per_periode: panjang > 0 ? Math.round((totalKasusSaatIni / panjang) * 100) / 100 : 0,
    },
    ringkasanSebelumnya: {
      total_kasus_ispa: totalKasusSebelumnya,
      jumlah_hotspot: totalHotspotSebelumnya,
    },
    topKategori,
  } as DataAnalisis;
}

// ============================================================
// VARIAN SKDR: sama seperti ambilDataAnalisisKarhutlaIspaHotspot di
// atas, tapi sumber kasus ISPA dari skdr_mingguan (bukan input
// harian modul karhutla) -- selalu mingguan, wilayah cuma 1 nilai
// (taksonomi wilayah_kerja SKDR beda dari kode_wilker/zona karhutla).
// ============================================================

export async function ambilDataAnalisisKarhutlaSkdrHotspot(
  periodeKey: string,
  wilayahKerja: string | undefined
): Promise<DataAnalisis> {
  const tahunMatch = periodeKey.match(/^(\d+)-/);
  const tahun = tahunMatch ? Number(tahunMatch[1]) : new Date().getFullYear();

  const m = periodeKey.match(/W(\d+)_W(\d+)/);
  const periodeDari = m ? Number(m[1]) : 1;
  const periodeSampai = m ? Number(m[2]) : 53;
  const labelSaatIni = `Minggu ${periodeDari}-${periodeSampai} tahun ${tahun}`;

  const panjang = periodeSampai - periodeDari + 1;
  const periodeDariSebelumnya = Math.max(1, periodeDari - panjang);
  const periodeSampaiSebelumnya = periodeDari - 1;

  const wilayahKerjaBersih = wilayahKerja && wilayahKerja !== 'Semua' ? wilayahKerja : undefined;

  const [dataSaatIni, dataSebelumnya] = await Promise.all([
    ambilPerbandinganSkdrHotspot({ tahun, periodeAwal: periodeDari, periodeAkhir: periodeSampai, wilayahKerja: wilayahKerjaBersih }),
    periodeSampaiSebelumnya >= periodeDariSebelumnya
      ? ambilPerbandinganSkdrHotspot({ tahun, periodeAwal: periodeDariSebelumnya, periodeAkhir: periodeSampaiSebelumnya, wilayahKerja: wilayahKerjaBersih })
      : Promise.resolve([]),
  ]);

  const totalKasusSaatIni = dataSaatIni.reduce((t, d) => t + d.totalKasusIspa, 0);
  const totalHotspotSaatIni = dataSaatIni.reduce((t, d) => t + d.jumlahHotspot, 0);
  const totalKasusSebelumnya = dataSebelumnya.reduce((t, d) => t + d.totalKasusIspa, 0);
  const totalHotspotSebelumnya = dataSebelumnya.reduce((t, d) => t + d.jumlahHotspot, 0);

  const topKategori: DataAnalisis['topKategori'] = [];
  dataSaatIni.forEach((d) => {
    topKategori.push({ kategori: 'kasus_ispa', nilai: d.periodeLabel, jumlah: d.totalKasusIspa });
    topKategori.push({ kategori: 'hotspot', nilai: d.periodeLabel, jumlah: d.jumlahHotspot });
  });

  return {
    labelKonteks: 'Karhutla — Kasus ISPA (SKDR) vs Titik Panas',
    labelWilayah: wilayahKerjaBersih ?? 'Seluruh wilayah kerja SKDR',
    labelPeriodeSaatIni: labelSaatIni,
    labelPeriodeSebelumnya: `Minggu ${periodeDariSebelumnya}-${periodeSampaiSebelumnya} tahun ${tahun}`,
    ringkasanSaatIni: {
      total_kasus_ispa: totalKasusSaatIni,
      jumlah_hotspot: totalHotspotSaatIni,
      rata_rata_kasus_per_periode: panjang > 0 ? Math.round((totalKasusSaatIni / panjang) * 100) / 100 : 0,
    },
    ringkasanSebelumnya: {
      total_kasus_ispa: totalKasusSebelumnya,
      jumlah_hotspot: totalHotspotSebelumnya,
    },
    topKategori,
  } as DataAnalisis;
}