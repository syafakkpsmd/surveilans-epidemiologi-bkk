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
  'cop-negara-tren', 
  'penumpang-mingguan',
  'penumpang-bulanan',
  'pesawat-mingguan',
  'pesawat-bulanan',
  'vektor-dbd-mingguan',
  'vektor-dbd-bulanan',
  'tikus-lab-mingguan',
  'tikus-lab-bulanan',
  'vektor-tikus-mingguan',   // <-- TAMBAH
  'vektor-tikus-bulanan',    // <-- TAMBAH
  'anopheles-dewasa-mingguan',
  'anopheles-dewasa-bulanan',
  'anopheles-larva-mingguan',
  'anopheles-larva-bulanan',
  'tpp-bulanan',
  'ttu-bulanan',
  'pab-bulanan',
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

/**
 * Konteks yang boleh dipakai untuk tipe="prediksi". Vektor DBD tetap
 * ditangani terpisah lewat isKonteksVektor() (route.ts). Daftar ini
 * untuk breakdown/tren non-vektor-dbd yang sudah punya prompt prediksi
 * tersendiri di lib/ai/prompt.ts.
 */
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
  'vektor-tikus-mingguan',   // <-- TAMBAH
  'vektor-tikus-bulanan',    // <-- TAMBAH
  'anopheles-dewasa-mingguan',
  'anopheles-dewasa-bulanan',
  'anopheles-larva-mingguan',
  'anopheles-larva-bulanan',
  'tpp-bulanan',   // <-- TAMBAH
  'ttu-bulanan',   // <-- TAMBAH
  'pab-bulanan',   // <-- TAMBAH
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

/** Vektor DBD SAJA -- Tikus & Anopheles TIDAK termasuk (walau sama-sama
 * "vektor" secara domain), karena keduanya pakai kode_wilker opsional
 * (boleh "Semua Wilayah Kerja"), beda dari DBD yang mewajibkan 1 wilker. */
export function isKonteksVektor(konteks: KonteksAnalisis): boolean {
  return konteks === 'vektor-dbd-mingguan' || konteks === 'vektor-dbd-bulanan';
}

/** Konteks yang wilayah_kerja-nya pakai format kode_wilker ("WK01", dst,
 * OPSIONAL -- boleh kosong untuk "Semua Wilayah Kerja"), BUKAN enum
 * Wilayah ("Samarinda", dst) seperti COP/PHQC. */
export function isKonteksKodeWilkerOpsional(konteks: KonteksAnalisis): boolean {
  return (
    konteks === 'pesawat-mingguan' ||
    konteks === 'pesawat-bulanan' ||
    konteks === 'tikus-lab-mingguan' ||
    konteks === 'tikus-lab-bulanan' ||
    konteks === 'vektor-tikus-mingguan' ||   // <-- TAMBAH
    konteks === 'vektor-tikus-bulanan' ||    // <-- TAMBAH
    konteks.startsWith('anopheles-')
  );
}

/** TPP/TTU/PAB — wilayah_kerja teks bebas (nama lokasi dari data sheet),
 * BUKAN kode_wilker maupun enum Wilayah. Hanya periode Bulanan. */
export function isKonteksSanitasi(konteks: KonteksAnalisis): boolean {
  return konteks === 'tpp-bulanan' || konteks === 'ttu-bulanan' || konteks === 'pab-bulanan';
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
      : rows[periodeUrutan - 1]; // bulanan sudah terurut Jan..Des

  if (!cocok) return {};
  const hasil: Record<string, number> = {};
  for (const [k, v] of Object.entries(cocok)) {
    if (typeof v === 'number') hasil[k] = v;
  }
  return hasil;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Ambil top N negara (berdasar total kedatangan periode ini+sebelumnya
 * digabung), lalu selaraskan kedua record supaya key-nya sama persis
 * (negara yang tidak muncul di salah satu periode diisi 0) -- supaya
 * AI bisa membandingkan apple-to-apple per negara.
 */
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

/**
 * Breakdown jumlah_kapal per 6 wilayah kerja COP untuk SATU periode.
 * CATATAN: wilayah_kerja SENGAJA diabaikan (parameter tidak diminta) --
 * section ini memang selalu membandingkan ke-6 wilayah sekaligus, sama
 * seperti TrenPerWilkerChart di page.tsx yang tidak ikut filter wilayah.
 */
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
/**
 * Titik masuk utama -- dipanggil dari Route Handler
 * (app/api/analisis-ai/route.ts). wilayahKerja generik string:
 *   - COP/PHQC          : nilai enum Wilayah ("Samarinda", dst.)
 *   - Vektor DBD        : kode_wilker ("WK01", dst.), WAJIB diisi
 *   - Pesawat/Tikus/
 *     Anopheles         : kode_wilker ("WK01", dst.), OPSIONAL
 * metrik HANYA relevan untuk konteks vektor DBD.
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

  if (konteks === 'vektor-tikus-mingguan' || konteks === 'vektor-tikus-bulanan') {
    if (konteks === 'vektor-tikus-mingguan') {
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

  if (konteks === 'tikus-lab-mingguan' || konteks === 'tikus-lab-bulanan') {
    if (konteks === 'tikus-lab-mingguan') {
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

    if (konteks === 'tpp-bulanan' || konteks === 'ttu-bulanan' || konteks === 'pab-bulanan') {
    const periodeSaatIni = parsePeriodeBulanan(periodeKey);
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const ambil =
      konteks === 'tpp-bulanan' ? ambilTppBulanan : konteks === 'ttu-bulanan' ? ambilTtuBulanan : ambilPabBulanan;
    const [saatIni, sebelumnya] = await Promise.all([
      ambil(periodeSaatIni, wilayahKerja),
      ambil(periodeSebelumnya, wilayahKerja),
    ]);
    const labelModul =
      konteks === 'tpp-bulanan'
        ? 'Surveilans TPP (Tempat Pengelolaan Pangan)'
        : konteks === 'ttu-bulanan'
        ? 'Surveilans TTU (Tempat-Tempat Umum)'
        : 'Surveilans PAB (Penyediaan Air Bersih)';
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
  'cop-per-wilker': 'wilayah_kerja',
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
  const labelWilayah = wilayahKerja
  ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
  : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
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

  const labelWilayah = wilayahKerja
  ? (NAMA_WILKER[wilayahKerja] ?? wilayahKerja)
  : 'Seluruh wilayah kerja BKK Kelas I Samarinda';
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


