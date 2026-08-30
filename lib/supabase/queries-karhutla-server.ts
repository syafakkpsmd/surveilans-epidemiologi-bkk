import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import { getDaftarWilayahKerjaSkdr } from '@/lib/supabase/queries';
import { NAMA_WILKER, hitungStatusEvaluasi, type StatusEvaluasi } from '@/lib/karhutla/constants';
import {
  petakanLokasiUdaraKeWilker,
  cariWilkerTerdekatDariTitik,
  DAFTAR_KODE_WILKER,
  mundurkanTanggal,
} from '@/lib/karhutla/infografis-utils';

/**
 * Membangun filter Supabase .or() dari beberapa wilayahKey ("WK01" atau "WK01::Palaran").
 * Return null kalau array kosong (artinya tanpa filter = semua wilayah).
 */
function bangunFilterOrWilayah(wilayahKeys: string[] | undefined): string | null {
  if (!wilayahKeys || wilayahKeys.length === 0) return null;

  const klausa = wilayahKeys.map((key) => {
    const [kodeWilker, zona] = key.split('::');
    return zona
      ? `and(kode_wilker.eq.${kodeWilker},zona.eq.${zona})`
      : `and(kode_wilker.eq.${kodeWilker},zona.is.null)`;
  });

  return klausa.join(',');
}

/**
 * HANYA untuk dipanggil dari Server Component / Route Handler / Server Action.
 * Jangan pernah import file ini dari komponen yang ada 'use client'.
 */

// ------------------------------------------------------------
// Tren "N hari terakhir": kasus ISPA vs PM2.5 vs jumlah titik api
// ------------------------------------------------------------

export interface TitikTrenIspa {
  tanggal: string;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  pm25_rerata: number | null;
  jumlah_titik_api: number;
}

/**
 * wilayahKey: gabungan "kode_wilker" atau "kode_wilker::zona" (mis. "WK01::Palaran").
 * "Semua" atau undefined = tanpa filter (gabungan semua wilayah).
 *
 * CATATAN: PM2.5 berasal dari tabel kualitas_udara_harian yang punya taksonomi
 * lokasi berbeda (8 lokasi) dari kode_wilker/zona ISPA (13 wilayah). Karena tidak
 * ada mapping 1:1, PM2.5 ditampilkan sebagai rerata REGIONAL (gabungan semua
 * lokasi) — konsisten dengan pola hotspot yang juga regional.
 */
export async function ambilTrenIspaPm25(
  opsi: { wilayahKeys?: string[]; hariTerakhir?: number } = {}
): Promise<TitikTrenIspa[]> {
  const { wilayahKeys, hariTerakhir = 30 } = opsi;
  const supabase = await createClient();

  const sejakTanggal = new Date();
  sejakTanggal.setDate(sejakTanggal.getDate() - hariTerakhir);
  const tanggalAwal = sejakTanggal.toISOString().slice(0, 10);
  const tanggalAkhir = new Date().toISOString().slice(0, 10);

  let queryIspa = supabase
    .from('ispa_harian')
    .select('tanggal, kode_wilker, zona, kasus_ispa_anak, kasus_ispa_dewasa')
    .gte('tanggal', tanggalAwal)
    .order('tanggal', { ascending: true });

  const filterOr = bangunFilterOrWilayah(wilayahKeys);
  if (filterOr) queryIspa = queryIspa.or(filterOr);

  const [
    { data: dataIspa, error: errIspa },
    { data: dataUdara, error: errUdara },
    { data: dataHotspot, error: errHotspot },
  ] = await Promise.all([
    queryIspa,
    supabase
      .from('kualitas_udara_harian')
      .select('tanggal, pm25')
      .gte('tanggal', tanggalAwal)
      .order('tanggal', { ascending: true }),
    supabase
      .from('hotspot_nasa_kaltim')
      .select('tanggal_deteksi, confidence')
      .gte('tanggal_deteksi', tanggalAwal)
      .gt('confidence', 80),
  ]);

  if (errIspa) throw new Error(`Gagal mengambil tren ISPA: ${errIspa.message}`);
  if (errUdara) throw new Error(`Gagal mengambil data PM2.5: ${errUdara.message}`);
  if (errHotspot) throw new Error(`Gagal mengambil data titik api: ${errHotspot.message}`);

  const mapPm25 = new Map<string, { total: number; jml: number }>();
  for (const baris of dataUdara ?? []) {
    if (baris.pm25 == null) continue;
    const entri = mapPm25.get(baris.tanggal) ?? { total: 0, jml: 0 };
    entri.total += Number(baris.pm25);
    entri.jml += 1;
    mapPm25.set(baris.tanggal, entri);
  }
  const pm25PerTanggal = (tanggal: string): number | null => {
    const e = mapPm25.get(tanggal);
    return e && e.jml > 0 ? Number((e.total / e.jml).toFixed(1)) : null;
  };

  const mapHotspot = new Map<string, number>();
  for (const baris of dataHotspot ?? []) {
    const tanggal = baris.tanggal_deteksi;
    mapHotspot.set(tanggal, (mapHotspot.get(tanggal) ?? 0) + 1);
  }

  const mapIspa = new Map<string, { kasus_ispa_anak: number; kasus_ispa_dewasa: number }>();
  for (const baris of dataIspa ?? []) {
    const entri = mapIspa.get(baris.tanggal) ?? { kasus_ispa_anak: 0, kasus_ispa_dewasa: 0 };
    entri.kasus_ispa_anak += baris.kasus_ispa_anak;
    entri.kasus_ispa_dewasa += baris.kasus_ispa_dewasa;
    mapIspa.set(baris.tanggal, entri);
  }

  // Loop kalender penuh (sama seperti ambilTrenHarianRentang) —
  // supaya PM2.5/titik api tetap tampil walau kasus ISPA 0/kosong hari itu.
  const hasil: TitikTrenIspa[] = [];
  const kursor = new Date(tanggalAwal);
  const akhir = new Date(tanggalAkhir);
  while (kursor <= akhir) {
    const tanggalStr = kursor.toISOString().slice(0, 10);
    const ispa = mapIspa.get(tanggalStr);
    hasil.push({
      tanggal: tanggalStr,
      kasus_ispa_anak: ispa?.kasus_ispa_anak ?? 0,
      kasus_ispa_dewasa: ispa?.kasus_ispa_dewasa ?? 0,
      pm25_rerata: pm25PerTanggal(tanggalStr),
      jumlah_titik_api: mapHotspot.get(tanggalStr) ?? 0,
    });
    kursor.setDate(kursor.getDate() + 1);
  }

  return hasil;
}
// ------------------------------------------------------------
// Cache hotspot untuk peta (snapshot titik terbaru, bukan tren)
// ------------------------------------------------------------

export async function ambilHotspotCache(hariTerakhir = 3) {
  const supabase = await createClient();
  const sejakTanggal = new Date();
  sejakTanggal.setDate(sejakTanggal.getDate() - hariTerakhir);

  const { data, error } = await supabase
    .from('hotspot_nasa_kaltim')
    .select('*')
    .gte('tanggal_deteksi', sejakTanggal.toISOString().slice(0, 10))
    .order('tanggal_deteksi', { ascending: false });

  if (error) throw new Error(`Gagal mengambil cache hotspot: ${error.message}`);
  return data ?? [];
}

// ------------------------------------------------------------
// Daftar wilayah ISPA & lokasi kualitas udara - DINAMIS dari
// database (tabel wilayah_ispa / lokasi_kualitas_udara), bisa
// dikelola admin. Ini menggantikan DAFTAR_WILAYAH_KARHUTLA dan
// LOKASI_KUALITAS_UDARA yang tadinya hardcoded di constants.ts.
// ------------------------------------------------------------

export interface WilayahIspaRow {
  id: string;
  label: string;
  kode_wilker: string;
  zona: string | null;
  urutan: number;
}

export async function ambilDaftarWilayahIspa(): Promise<WilayahIspaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wilayah_ispa')
    .select('id, label, kode_wilker, zona, urutan')
    .order('urutan', { ascending: true });

  if (error) throw new Error(`Gagal mengambil daftar wilayah ISPA: ${error.message}`);
  return data ?? [];
}

export interface LokasiUdaraRow {
  id: string;
  nama: string;
  lokasi_induk: string;
  sub_lokasi: string | null;
  urutan: number;
}

export async function ambilDaftarLokasiUdara(): Promise<LokasiUdaraRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lokasi_kualitas_udara')
    .select('id, nama, lokasi_induk, sub_lokasi, urutan')
    .order('urutan', { ascending: true });

  if (error) throw new Error(`Gagal mengambil daftar lokasi kualitas udara: ${error.message}`);
  return data ?? [];
}

// ------------------------------------------------------------
// Perbandingan ISPA vs Hotspot untuk rentang periode pilihan user
// ------------------------------------------------------------

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export interface TitikPerbandinganIspaHotspot {
  periode: number;
  periodeLabel: string;
  totalKasusIspa: number;
  totalKasusAnak: number;
  totalKasusDewasa: number;
  pm25Rerata: number | null; // regional, lihat catatan di ambilTrenIspaPm25
  jumlahHotspot: number;
}

export interface OpsiPerbandinganIspaHotspot {
  granularitas: 'mingguan' | 'bulanan';
  tahun: number;
  periodeAwal: number;
  periodeAkhir: number;
  wilayahKeys?: string[];
}

export async function ambilPerbandinganIspaHotspot(
  opsi: OpsiPerbandinganIspaHotspot
): Promise<TitikPerbandinganIspaHotspot[]> {
  const { granularitas, tahun, periodeAwal, periodeAkhir, wilayahKeys } = opsi;
  const supabase = await createClient();

  const filterOr = bangunFilterOrWilayah(wilayahKeys);

  const mapIspa = new Map<number, { anak: number; dewasa: number }>();
  const mapUdara = new Map<number, { total: number; jml: number }>();
  const mapHotspot = new Map<number, number>();

  if (granularitas === 'mingguan') {
    let queryIspa = supabase
      .from('view_karhutla_ispa_mingguan')
      .select('*')
      .eq('tahun_epid', tahun)
      .gte('minggu_epid', periodeAwal)
      .lte('minggu_epid', periodeAkhir);
    if (filterOr) queryIspa = queryIspa.or(filterOr);

    const [ispaRes, udaraRes, hotspotRes] = await Promise.all([
      queryIspa,
      supabase
        .from('view_kualitas_udara_mingguan')
        .select('*')
        .eq('tahun_epid', tahun)
        .gte('minggu_epid', periodeAwal)
        .lte('minggu_epid', periodeAkhir),
      supabase
        .from('view_hotspot_kaltim_mingguan')
        .select('*')
        .eq('tahun_epid', tahun)
        .gte('minggu_epid', periodeAwal)
        .lte('minggu_epid', periodeAkhir),
    ]);

    if (ispaRes.error) throw new Error(`Gagal mengambil data ISPA: ${ispaRes.error.message}`);
    if (udaraRes.error) throw new Error(`Gagal mengambil data kualitas udara: ${udaraRes.error.message}`);
    if (hotspotRes.error) throw new Error(`Gagal mengambil data hotspot: ${hotspotRes.error.message}`);

    for (const baris of ispaRes.data ?? []) {
      const periode = baris.minggu_epid as number;
      const entri = mapIspa.get(periode) ?? { anak: 0, dewasa: 0 };
      entri.anak += baris.total_kasus_anak ?? 0;
      entri.dewasa += baris.total_kasus_dewasa ?? 0;
      mapIspa.set(periode, entri);
    }
    for (const baris of udaraRes.data ?? []) {
      if (baris.pm25_rerata == null) continue;
      const periode = baris.minggu_epid as number;
      const entri = mapUdara.get(periode) ?? { total: 0, jml: 0 };
      entri.total += Number(baris.pm25_rerata);
      entri.jml += 1;
      mapUdara.set(periode, entri);
    }
    for (const baris of hotspotRes.data ?? []) {
      mapHotspot.set(baris.minggu_epid as number, baris.jumlah_hotspot ?? 0);
    }
  } else {
    let queryIspa = supabase
      .from('view_karhutla_ispa_bulanan')
      .select('*')
      .eq('tahun', tahun)
      .gte('bulan', periodeAwal)
      .lte('bulan', periodeAkhir);
    if (filterOr) queryIspa = queryIspa.or(filterOr);

    const [ispaRes, udaraRes, hotspotRes] = await Promise.all([
      queryIspa,
      supabase
        .from('view_kualitas_udara_bulanan')
        .select('*')
        .eq('tahun', tahun)
        .gte('bulan', periodeAwal)
        .lte('bulan', periodeAkhir),
      supabase
        .from('view_hotspot_kaltim_bulanan')
        .select('*')
        .eq('tahun', tahun)
        .gte('bulan', periodeAwal)
        .lte('bulan', periodeAkhir),
    ]);

    if (ispaRes.error) throw new Error(`Gagal mengambil data ISPA: ${ispaRes.error.message}`);
    if (udaraRes.error) throw new Error(`Gagal mengambil data kualitas udara: ${udaraRes.error.message}`);
    if (hotspotRes.error) throw new Error(`Gagal mengambil data hotspot: ${hotspotRes.error.message}`);

    for (const baris of ispaRes.data ?? []) {
      const periode = baris.bulan as number;
      const entri = mapIspa.get(periode) ?? { anak: 0, dewasa: 0 };
      entri.anak += baris.total_kasus_anak ?? 0;
      entri.dewasa += baris.total_kasus_dewasa ?? 0;
      mapIspa.set(periode, entri);
    }
    for (const baris of udaraRes.data ?? []) {
      if (baris.pm25_rerata == null) continue;
      const periode = baris.bulan as number;
      const entri = mapUdara.get(periode) ?? { total: 0, jml: 0 };
      entri.total += Number(baris.pm25_rerata);
      entri.jml += 1;
      mapUdara.set(periode, entri);
    }
    for (const baris of hotspotRes.data ?? []) {
      mapHotspot.set(baris.bulan as number, baris.jumlah_hotspot ?? 0);
    }
  }

  const isMingguan = granularitas === 'mingguan';
  const hasil: TitikPerbandinganIspaHotspot[] = [];
  for (let p = periodeAwal; p <= periodeAkhir; p++) {
    const ispa = mapIspa.get(p);
    const udara = mapUdara.get(p);
    hasil.push({
      periode: p,
      periodeLabel: isMingguan ? `Mg ${p}` : NAMA_BULAN[p - 1],
      totalKasusIspa: (ispa?.anak ?? 0) + (ispa?.dewasa ?? 0),
      totalKasusAnak: ispa?.anak ?? 0,
      totalKasusDewasa: ispa?.dewasa ?? 0,
      pm25Rerata: udara && udara.jml > 0 ? Number((udara.total / udara.jml).toFixed(1)) : null,
      jumlahHotspot: mapHotspot.get(p) ?? 0,
    });
  }

  return hasil;
}

// ------------------------------------------------------------
// Perbandingan ISPA (sumber SKDR) vs Hotspot -- dipakai tombol
// "SKDR" di grafik Analisis Kasus ISPA vs Titik Panas.
// Beda dari ambilPerbandinganIspaHotspot() di atas: sumber kasus
// ISPA di sini adalah skdr_mingguan (data yang sudah diinput lewat
// modul SKDR), bukan ispa_harian punya modul karhutla. Data hotspot
// & PM2.5 regional tetap dari view yang sama (tidak terikat sistem
// wilayah karhutla kode_wilker/zona).
// ------------------------------------------------------------

// id 24 = 'ISPA-AA' di skdr_jenis_penyakit, lihat DAFTAR_PENYAKIT_SKDR
// di app/(dashboard)/dashboard/skdr/SkdrClient.tsx
const JENIS_PENYAKIT_ISPA_SKDR_ID = 24;

export interface OpsiPerbandinganSkdrHotspot {
  tahun: number;
  periodeAwal: number; // minggu epid, 1-53
  periodeAkhir: number;
  wilayahKerja?: string; // wilayah_kerja SKDR (satu nilai, bukan multi) -- kosong = semua wilayah
}

export async function ambilPerbandinganSkdrHotspot(
  opsi: OpsiPerbandinganSkdrHotspot
): Promise<TitikPerbandinganIspaHotspot[]> {
  const { tahun, periodeAwal, periodeAkhir, wilayahKerja } = opsi;
  const supabase = await createClient();

  let querySkdr = supabase
    .from('skdr_mingguan')
    .select('minggu_epid, jumlah_kasus')
    .eq('tahun_epid', tahun)
    .eq('jenis_penyakit_id', JENIS_PENYAKIT_ISPA_SKDR_ID)
    .gte('minggu_epid', periodeAwal)
    .lte('minggu_epid', periodeAkhir);
  if (wilayahKerja) querySkdr = querySkdr.eq('wilayah_kerja', wilayahKerja);

  const [skdrRes, udaraRes, hotspotRes] = await Promise.all([
    querySkdr,
    supabase
      .from('view_kualitas_udara_mingguan')
      .select('*')
      .eq('tahun_epid', tahun)
      .gte('minggu_epid', periodeAwal)
      .lte('minggu_epid', periodeAkhir),
    supabase
      .from('view_hotspot_kaltim_mingguan')
      .select('*')
      .eq('tahun_epid', tahun)
      .gte('minggu_epid', periodeAwal)
      .lte('minggu_epid', periodeAkhir),
  ]);

  if (skdrRes.error) throw new Error(`Gagal mengambil data ISPA SKDR: ${skdrRes.error.message}`);
  if (udaraRes.error) throw new Error(`Gagal mengambil data kualitas udara: ${udaraRes.error.message}`);
  if (hotspotRes.error) throw new Error(`Gagal mengambil data hotspot: ${hotspotRes.error.message}`);

  const mapSkdr = new Map<number, number>();
  for (const baris of skdrRes.data ?? []) {
    const periode = baris.minggu_epid as number;
    mapSkdr.set(periode, (mapSkdr.get(periode) ?? 0) + (baris.jumlah_kasus ?? 0));
  }

  const mapUdara = new Map<number, { total: number; jml: number }>();
  for (const baris of udaraRes.data ?? []) {
    if (baris.pm25_rerata == null) continue;
    const periode = baris.minggu_epid as number;
    const entri = mapUdara.get(periode) ?? { total: 0, jml: 0 };
    entri.total += Number(baris.pm25_rerata);
    entri.jml += 1;
    mapUdara.set(periode, entri);
  }

  const mapHotspot = new Map<number, number>();
  for (const baris of hotspotRes.data ?? []) {
    mapHotspot.set(baris.minggu_epid as number, baris.jumlah_hotspot ?? 0);
  }

  const hasil: TitikPerbandinganIspaHotspot[] = [];
  for (let p = periodeAwal; p <= periodeAkhir; p++) {
    const udara = mapUdara.get(p);
    const totalKasus = mapSkdr.get(p) ?? 0;
    hasil.push({
      periode: p,
      periodeLabel: `Mg ${p}`,
      totalKasusIspa: totalKasus,
      totalKasusAnak: 0, // skdr_mingguan tidak memecah anak/dewasa
      totalKasusDewasa: 0,
      pm25Rerata: udara && udara.jml > 0 ? Number((udara.total / udara.jml).toFixed(1)) : null,
      jumlahHotspot: mapHotspot.get(p) ?? 0,
    });
  }

  return hasil;
}

/** Daftar wilayah_kerja SKDR (taksonomi berbeda dari kode_wilker/zona karhutla). */
export async function ambilDaftarWilayahKerjaSkdr(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('view_wilayah_kerja_skdr').select('wilayah_kerja');
  if (error) throw new Error(`Gagal mengambil daftar wilayah kerja SKDR: ${error.message}`);
  return (data ?? []).map((d) => d.wilayah_kerja as string).filter(Boolean);
}
// oleh /dashboard/karhutla/data untuk menampilkan & unduh CSV.
// ------------------------------------------------------------

export interface BarisTabelIspa {
  id: string;
  tanggal: string;
  kode_wilker: string;
  zona: string | null;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  keterangan: string | null;
}

export async function ambilTabelIspa(hariTerakhir = 90): Promise<BarisTabelIspa[]> {
  const supabase = await createClient();
  const sejak = new Date();
  sejak.setDate(sejak.getDate() - hariTerakhir);

  const { data, error } = await supabase
    .from('ispa_harian')
    .select('id, tanggal, kode_wilker, zona, kasus_ispa_anak, kasus_ispa_dewasa, keterangan')
    .gte('tanggal', sejak.toISOString().slice(0, 10))
    .order('tanggal', { ascending: false });

  if (error) throw new Error(`Gagal mengambil data tabel ISPA: ${error.message}`);
  return data ?? [];
}

export interface BarisTabelKualitasUdara {
  id: string;
  tanggal: string;
  lokasi: string;
  pm25: number | null;
  pm10: number | null;
  suhu: number | null;
  hcho: number | null;
  tvoc: number | null;
  kelembapan: number | null;
  ispu_status: string | null;
  status_evaluasi: string | null;
  catatan_evaluasi: string | null;
}

export async function ambilTabelKualitasUdara(hariTerakhir = 90): Promise<BarisTabelKualitasUdara[]> {
  const supabase = await createClient();
  const sejak = new Date();
  sejak.setDate(sejak.getDate() - hariTerakhir);

  const { data, error } = await supabase
    .from('kualitas_udara_harian')
    .select(
      'id, tanggal, lokasi, pm25, pm10, suhu, hcho, tvoc, kelembapan, ispu_status, status_evaluasi, catatan_evaluasi'
    )
    .gte('tanggal', sejak.toISOString().slice(0, 10))
    .order('tanggal', { ascending: false });

  if (error) throw new Error(`Gagal mengambil data tabel kualitas udara: ${error.message}`);
  return data ?? [];
}

// ------------------------------------------------------------
// Grafik harian dengan rentang tanggal BEBAS (beda dari
// ambilTrenIspaPm25 yang cuma "N hari terakhir" tetap).
// Dipakai untuk fitur "grafik harian dengan rentang".
// ------------------------------------------------------------

export type ParameterUdara = 'pm25' | 'pm10' | 'suhu' | 'hcho' | 'tvoc' | 'kelembapan';

export interface TitikTrenHarianRentang {
  tanggal: string;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  nilai_parameter_udara: number | null; // rerata regional untuk parameter yang dipilih
  jumlah_titik_api: number;
}

export interface OpsiTrenHarianRentang {
  tanggalAwal: string;
  tanggalAkhir: string;
  wilayahKeys?: string[]; // filter utk data ISPA (taksonomi kode_wilker/zona)
  lokasiUdara?: string[]; // filter utk data kualitas udara (taksonomi lokasi_kualitas_udara.nama) -- terpisah dari wilayahKeys krn sistem lokasi beda antara modul ISPA & kualitas udara
  parameterUdara?: ParameterUdara;
}

export async function ambilTrenHarianRentang(
  opsi: OpsiTrenHarianRentang
): Promise<TitikTrenHarianRentang[]> {
  const { tanggalAwal, tanggalAkhir, wilayahKeys, lokasiUdara, parameterUdara = 'pm25' } = opsi;
  const supabase = await createClient();

  let queryIspa = supabase
    .from('ispa_harian')
    .select('tanggal, kode_wilker, zona, kasus_ispa_anak, kasus_ispa_dewasa')
    .gte('tanggal', tanggalAwal)
    .lte('tanggal', tanggalAkhir)
    .order('tanggal', { ascending: true });

  const filterOr = bangunFilterOrWilayah(wilayahKeys);
  if (filterOr) queryIspa = queryIspa.or(filterOr);

  let queryUdara = supabase
    .from('kualitas_udara_harian')
    .select(`tanggal, lokasi, ${parameterUdara}`)
    .gte('tanggal', tanggalAwal)
    .lte('tanggal', tanggalAkhir)
    .order('tanggal', { ascending: true });
  if (lokasiUdara && lokasiUdara.length > 0) queryUdara = queryUdara.in('lokasi', lokasiUdara);

  const [
    { data: dataIspa, error: errIspa },
    { data: dataUdara, error: errUdara },
    { data: dataHotspot, error: errHotspot },
  ] = await Promise.all([
    queryIspa,
    queryUdara,
    supabase
      .from('hotspot_nasa_kaltim')
      .select('tanggal_deteksi, confidence')
      .gte('tanggal_deteksi', tanggalAwal)
      .lte('tanggal_deteksi', tanggalAkhir)
      .gt('confidence', 80),
  ]);

  if (errIspa) throw new Error(`Gagal mengambil data ISPA: ${errIspa.message}`);
  if (errUdara) throw new Error(`Gagal mengambil data kualitas udara: ${errUdara.message}`);
  if (errHotspot) throw new Error(`Gagal mengambil data titik api: ${errHotspot.message}`);

  const mapUdara = new Map<string, { total: number; jml: number }>();
  for (const baris of (dataUdara ?? []) as Record<string, unknown>[]) {
    const nilai = baris[parameterUdara] as number | null;
    if (nilai == null) continue;
    const tanggal = baris.tanggal as string;
    const entri = mapUdara.get(tanggal) ?? { total: 0, jml: 0 };
    entri.total += Number(nilai);
    entri.jml += 1;
    mapUdara.set(tanggal, entri);
  }

  const mapIspa = new Map<string, { anak: number; dewasa: number }>();
  for (const baris of dataIspa ?? []) {
    const entri = mapIspa.get(baris.tanggal) ?? { anak: 0, dewasa: 0 };
    entri.anak += baris.kasus_ispa_anak;
    entri.dewasa += baris.kasus_ispa_dewasa;
    mapIspa.set(baris.tanggal, entri);
  }

  const mapHotspot = new Map<string, number>();
  for (const baris of dataHotspot ?? []) {
    const tanggal = baris.tanggal_deteksi;
    mapHotspot.set(tanggal, (mapHotspot.get(tanggal) ?? 0) + 1);
  }

  const hasil: TitikTrenHarianRentang[] = [];
  const kursor = new Date(tanggalAwal);
  const akhir = new Date(tanggalAkhir);
  while (kursor <= akhir) {
    const tanggalStr = kursor.toISOString().slice(0, 10);
    const ispa = mapIspa.get(tanggalStr);
    const udara = mapUdara.get(tanggalStr);
    hasil.push({
      tanggal: tanggalStr,
      kasus_ispa_anak: ispa?.anak ?? 0,
      kasus_ispa_dewasa: ispa?.dewasa ?? 0,
      nilai_parameter_udara: udara && udara.jml > 0 ? Number((udara.total / udara.jml).toFixed(2)) : null,
      jumlah_titik_api: mapHotspot.get(tanggalStr) ?? 0,
    });
    kursor.setDate(kursor.getDate() + 1);
  }

  return hasil;
}

export interface BarisTabelHotspot {
  id: string;
  tanggal_deteksi: string;
  jam_deteksi: string | null;
  latitude: number;
  longitude: number;
  confidence: number | null;
  confidence_asli: string | null;
  satelit: string | null;
  frp: number | null;
}

export async function ambilTabelHotspot(hariTerakhir = 90): Promise<BarisTabelHotspot[]> {
  const supabase = await createClient();
  const sejak = new Date();
  sejak.setDate(sejak.getDate() - hariTerakhir);

  const { data, error } = await supabase
    .from('hotspot_nasa_kaltim')
    .select('id, tanggal_deteksi, jam_deteksi, latitude, longitude, confidence, confidence_asli, satelit, frp')
    .gte('tanggal_deteksi', sejak.toISOString().slice(0, 10))
    .order('tanggal_deteksi', { ascending: false });

  if (error) throw new Error(`Gagal mengambil data tabel hotspot: ${error.message}`);
  return data ?? [];
}
// ------------------------------------------------------------
// Info Grafis Karhutla harian — ringkasan 1 hari untuk halaman
// /dashboard/karhutla/infografis (poster yang bisa diunduh JPEG/PDF).
// Menggabungkan ISPA, kualitas udara (PM2.5/ISPU), titik panas, dan
// perbandingan SKDR mingguan — dipecah per wilayah kerja.
// ------------------------------------------------------------

export interface RingkasanWilker {
  kode_wilker: string;
  nama: string;
  kasusIspaAnak: number;
  kasusIspaDewasa: number;
  jumlahHotspot: number;
  pm25Rerata: number | null;
  pm10Rerata: number | null;
  suhuRerata: number | null;
  hchoRerata: number | null;
  tvocRerata: number | null;
  kelembapanRerata: number | null;
  statusIspu: string | null;
  statusEvaluasi: StatusEvaluasi;
}

export interface TitikTren7Hari {
  tanggal: string;
  totalIspa: number;
  jumlahHotspot: number;
}

export interface RingkasanSkdrMingguan {
  label: string;
  totalKasus: number;
}

export interface RingkasanSkdrPerWilayah {
  wilayah: string;
  mingguLalu: number;
  mingguIni: number;
}

export interface RingkasanInfografisHarian {
  tanggalDiminta: string;
  tanggalDitampilkan: string; // bisa beda dari tanggalDiminta kalau fallback dipakai
  pakaiFallback: boolean;
  totalHotspot: number;
  totalIspaAnak: number;
  totalIspaDewasa: number;
  pm25Rerata: number | null; // rerata regional (semua lokasi)
  statusIspuDominan: string | null;
  perWilker: RingkasanWilker[];
  hotspotPoints: { latitude: number; longitude: number }[];
  tren7Hari: TitikTren7Hari[];
  skdrMingguIni: RingkasanSkdrMingguan;
  skdrMingguLalu: RingkasanSkdrMingguan;
  skdrPerWilayah: RingkasanSkdrPerWilayah[];
}

export async function ambilRingkasanInfografisHarian(
  tanggalDiminta: string
): Promise<RingkasanInfografisHarian> {
  const supabase = await createClient();

  // --- 1. Tentukan tanggal efektif: fallback ke tanggal terakhir yang ada
  //        data kalau tanggal yang diminta masih kosong (mis. cron belum
  //        sempat jalan / belum ada input manual hari itu). ---
  const tanggalMulaiCek = mundurkanTanggal(tanggalDiminta, 13);
  const [{ data: cekIspa }, { data: cekHotspot }] = await Promise.all([
    supabase.from('ispa_harian').select('tanggal').gte('tanggal', tanggalMulaiCek).lte('tanggal', tanggalDiminta),
    supabase
      .from('hotspot_nasa_kaltim')
      .select('tanggal_deteksi')
      .gte('tanggal_deteksi', tanggalMulaiCek)
      .lte('tanggal_deteksi', tanggalDiminta)
      .gt('confidence', 80),
  ]);

  const tanggalTersedia = new Set<string>();
  for (const b of cekIspa ?? []) tanggalTersedia.add(b.tanggal);
  for (const b of cekHotspot ?? []) tanggalTersedia.add(b.tanggal_deteksi);

  let tanggalDitampilkan = tanggalDiminta;
  let pakaiFallback = false;
  if (!tanggalTersedia.has(tanggalDiminta)) {
    const terurut = Array.from(tanggalTersedia).sort().reverse();
    if (terurut.length > 0) {
      tanggalDitampilkan = terurut[0];
      pakaiFallback = true;
    }
  }

  // --- 2. Ambil data mentah untuk tanggal efektif ---
  const [
    { data: dataIspa, error: errIspa },
    { data: dataUdara, error: errUdara },
    { data: dataHotspot, error: errHotspot },
  ] = await Promise.all([
    supabase
      .from('ispa_harian')
      .select('kode_wilker, kasus_ispa_anak, kasus_ispa_dewasa')
      .eq('tanggal', tanggalDitampilkan),
    supabase
      .from('kualitas_udara_harian')
      .select('lokasi, pm25, pm10, suhu, hcho, tvoc, kelembapan, ispu_status')
      .eq('tanggal', tanggalDitampilkan),
    supabase
      .from('hotspot_nasa_kaltim')
      .select('latitude, longitude')
      .eq('tanggal_deteksi', tanggalDitampilkan)
      .gt('confidence', 80),
  ]);

  if (errIspa) throw new Error(`Gagal mengambil data ISPA: ${errIspa.message}`);
  if (errUdara) throw new Error(`Gagal mengambil data kualitas udara: ${errUdara.message}`);
  if (errHotspot) throw new Error(`Gagal mengambil data titik panas: ${errHotspot.message}`);

  // --- 3. Susun breakdown per wilker (7 wilker, selalu lengkap walau 0) ---
  const perWilkerMap = new Map<string, RingkasanWilker>();
  for (const kode of DAFTAR_KODE_WILKER) {
    perWilkerMap.set(kode, {
      kode_wilker: kode,
      nama: NAMA_WILKER[kode] ?? kode,
      kasusIspaAnak: 0,
      kasusIspaDewasa: 0,
      jumlahHotspot: 0,
      pm25Rerata: null,
      pm10Rerata: null,
      suhuRerata: null,
      hchoRerata: null,
      tvocRerata: null,
      kelembapanRerata: null,
      statusIspu: null,
      statusEvaluasi: 'BELUM_DIUJI',
    });
  }

  for (const b of dataIspa ?? []) {
    const w = perWilkerMap.get(b.kode_wilker);
    if (!w) continue; // kode_wilker di luar WK01-WK07 (jarang, tapi jaga-jaga)
    w.kasusIspaAnak += b.kasus_ispa_anak;
    w.kasusIspaDewasa += b.kasus_ispa_dewasa;
  }

  // Akumulasi rerata utk keenam parameter kualitas udara sekaligus (dulu cuma PM2.5) --
  // dipakai utk tabel "Kualitas Udara per Wilayah Kerja" di poster infografis.
  const PARAM_UDARA = ['pm25', 'pm10', 'suhu', 'hcho', 'tvoc', 'kelembapan'] as const;
  const akumulasiUdara = new Map<string, Record<(typeof PARAM_UDARA)[number], { total: number; jml: number }>>();
  const statusIspuPerWilker = new Map<string, string>();
  for (const b of (dataUdara ?? []) as Record<string, unknown>[]) {
    const kode = petakanLokasiUdaraKeWilker(b.lokasi as string);
    if (!kode || !perWilkerMap.has(kode)) continue;

    const akum =
      akumulasiUdara.get(kode) ??
      ({
        pm25: { total: 0, jml: 0 },
        pm10: { total: 0, jml: 0 },
        suhu: { total: 0, jml: 0 },
        hcho: { total: 0, jml: 0 },
        tvoc: { total: 0, jml: 0 },
        kelembapan: { total: 0, jml: 0 },
      } as Record<(typeof PARAM_UDARA)[number], { total: number; jml: number }>);
    for (const param of PARAM_UDARA) {
      const nilai = b[param] as number | null;
      if (nilai == null) continue;
      akum[param].total += Number(nilai);
      akum[param].jml += 1;
    }
    akumulasiUdara.set(kode, akum);

    if (b.ispu_status && !statusIspuPerWilker.has(kode)) {
      statusIspuPerWilker.set(kode, b.ispu_status as string);
    }
  }
  for (const [kode, akum] of akumulasiUdara) {
    const w = perWilkerMap.get(kode);
    if (!w) continue;
    if (akum.pm25.jml > 0) w.pm25Rerata = Number((akum.pm25.total / akum.pm25.jml).toFixed(1));
    if (akum.pm10.jml > 0) w.pm10Rerata = Number((akum.pm10.total / akum.pm10.jml).toFixed(1));
    if (akum.suhu.jml > 0) w.suhuRerata = Number((akum.suhu.total / akum.suhu.jml).toFixed(1));
    if (akum.hcho.jml > 0) w.hchoRerata = Number((akum.hcho.total / akum.hcho.jml).toFixed(2));
    if (akum.tvoc.jml > 0) w.tvocRerata = Number((akum.tvoc.total / akum.tvoc.jml).toFixed(2));
    if (akum.kelembapan.jml > 0) w.kelembapanRerata = Number((akum.kelembapan.total / akum.kelembapan.jml).toFixed(1));
    w.statusEvaluasi = hitungStatusEvaluasi({
      pm25: w.pm25Rerata,
      pm10: w.pm10Rerata,
      suhu: w.suhuRerata,
      hcho: w.hchoRerata,
      tvoc: w.tvocRerata,
      kelembapan: w.kelembapanRerata,
    });
  }
  for (const [kode, status] of statusIspuPerWilker) {
    const w = perWilkerMap.get(kode);
    if (w) w.statusIspu = status;
  }

  for (const b of dataHotspot ?? []) {
    const kode = cariWilkerTerdekatDariTitik(b.latitude, b.longitude);
    const w = perWilkerMap.get(kode);
    if (w) w.jumlahHotspot += 1;
  }

  const perWilker = DAFTAR_KODE_WILKER.map((k) => perWilkerMap.get(k)!);

  // --- 4. Total & rerata regional (semua lokasi, tanpa breakdown) ---
  const totalIspaAnak = perWilker.reduce((s, w) => s + w.kasusIspaAnak, 0);
  const totalIspaDewasa = perWilker.reduce((s, w) => s + w.kasusIspaDewasa, 0);
  const totalHotspot = perWilker.reduce((s, w) => s + w.jumlahHotspot, 0);
  const nilaiPm25Semua = (dataUdara ?? [])
    .map((b) => b.pm25)
    .filter((v): v is number => v != null)
    .map(Number);
  const pm25RerataRegional =
    nilaiPm25Semua.length > 0
      ? Number((nilaiPm25Semua.reduce((a, b) => a + b, 0) / nilaiPm25Semua.length).toFixed(1))
      : null;
  const statusIspuDominan = (dataUdara ?? []).find((b) => b.ispu_status)?.ispu_status ?? null;

  // --- 5. Tren 7 hari terakhir (berakhir di tanggalDitampilkan) ---
  const tanggalAwalTren = mundurkanTanggal(tanggalDitampilkan, 6);
  const [{ data: trenIspa }, { data: trenHotspot }] = await Promise.all([
    supabase
      .from('ispa_harian')
      .select('tanggal, kasus_ispa_anak, kasus_ispa_dewasa')
      .gte('tanggal', tanggalAwalTren)
      .lte('tanggal', tanggalDitampilkan),
    supabase
      .from('hotspot_nasa_kaltim')
      .select('tanggal_deteksi')
      .gte('tanggal_deteksi', tanggalAwalTren)
      .lte('tanggal_deteksi', tanggalDitampilkan)
      .gt('confidence', 80),
  ]);

  const mapTrenIspa = new Map<string, number>();
  for (const b of trenIspa ?? []) {
    mapTrenIspa.set(b.tanggal, (mapTrenIspa.get(b.tanggal) ?? 0) + b.kasus_ispa_anak + b.kasus_ispa_dewasa);
  }
  const mapTrenHotspot = new Map<string, number>();
  for (const b of trenHotspot ?? []) {
    mapTrenHotspot.set(b.tanggal_deteksi, (mapTrenHotspot.get(b.tanggal_deteksi) ?? 0) + 1);
  }
  const tren7Hari: TitikTren7Hari[] = [];
  for (let i = 6; i >= 0; i--) {
    const tgl = mundurkanTanggal(tanggalDitampilkan, i);
    tren7Hari.push({
      tanggal: tgl,
      totalIspa: mapTrenIspa.get(tgl) ?? 0,
      jumlahHotspot: mapTrenHotspot.get(tgl) ?? 0,
    });
  }

  // --- 6. Perbandingan SKDR mingguan: minggu berjalan vs minggu lalu,
  //        dihitung dari minggu epidemiologi tanggalDitampilkan. ---
  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date(`${tanggalDitampilkan}T00:00:00Z`));
  const mingguLaluEpid = mingguEpid > 1 ? mingguEpid - 1 : 52;
  const tahunMingguLalu = mingguEpid > 1 ? tahunEpid : tahunEpid - 1;

  const [skdrIni, skdrLalu, daftarWilayahSkdr] = await Promise.all([
    supabase
      .from('skdr_mingguan')
      .select('jumlah_kasus, wilayah_kerja')
      .eq('tahun_epid', tahunEpid)
      .eq('minggu_epid', mingguEpid)
      .eq('jenis_penyakit_id', JENIS_PENYAKIT_ISPA_SKDR_ID),
    supabase
      .from('skdr_mingguan')
      .select('jumlah_kasus, wilayah_kerja')
      .eq('tahun_epid', tahunMingguLalu)
      .eq('minggu_epid', mingguLaluEpid)
      .eq('jenis_penyakit_id', JENIS_PENYAKIT_ISPA_SKDR_ID),
    getDaftarWilayahKerjaSkdr(),
  ]);

  const totalSkdrIni = (skdrIni.data ?? []).reduce((s, b) => s + (b.jumlah_kasus ?? 0), 0);
  const totalSkdrLalu = (skdrLalu.data ?? []).reduce((s, b) => s + (b.jumlah_kasus ?? 0), 0);

  // --- 6b. Pecah SKDR per wilayah_kerja (Palaran, Sidomulyo, dst -- taksonomi
  //         wilayah_kerja SKDR, BEDA dari kode_wilker/zona karhutla di atas).
  //
  //         PENTING: kategori dasarnya diambil dari `view_wilayah_kerja_skdr`
  //         (daftar RESMI seluruh wilayah kerja SKDR yang sama dipakai di
  //         halaman /dashboard/skdr) -- BUKAN hanya wilayah yang kebetulan
  //         punya kasus di 2 minggu ini. Kalau basisnya cuma union dari data
  //         yang ada, wilayah dengan 0 kasus di kedua minggu (mis. Samarinda:
  //         Palaran & Sidomulyo saat sedang tidak ada laporan ISPA) akan
  //         hilang sama sekali dari grafik, padahal seharusnya tetap tampil
  //         sebagai batang 0. ---
  const mapSkdrIniPerWilayah = new Map<string, number>();
  for (const b of skdrIni.data ?? []) {
    if (!b.wilayah_kerja) continue;
    mapSkdrIniPerWilayah.set(b.wilayah_kerja, (mapSkdrIniPerWilayah.get(b.wilayah_kerja) ?? 0) + (b.jumlah_kasus ?? 0));
  }
  const mapSkdrLaluPerWilayah = new Map<string, number>();
  for (const b of skdrLalu.data ?? []) {
    if (!b.wilayah_kerja) continue;
    mapSkdrLaluPerWilayah.set(b.wilayah_kerja, (mapSkdrLaluPerWilayah.get(b.wilayah_kerja) ?? 0) + (b.jumlah_kasus ?? 0));
  }
  const semuaWilayahSkdr = new Set([
    ...daftarWilayahSkdr,
    ...mapSkdrIniPerWilayah.keys(),
    ...mapSkdrLaluPerWilayah.keys(),
  ]);
  const skdrPerWilayah: RingkasanSkdrPerWilayah[] = Array.from(semuaWilayahSkdr)
    .sort()
    .map((wilayah) => ({
      wilayah,
      mingguLalu: mapSkdrLaluPerWilayah.get(wilayah) ?? 0,
      mingguIni: mapSkdrIniPerWilayah.get(wilayah) ?? 0,
    }));

  return {
    tanggalDiminta,
    tanggalDitampilkan,
    pakaiFallback,
    totalHotspot,
    totalIspaAnak,
    totalIspaDewasa,
    pm25Rerata: pm25RerataRegional,
    statusIspuDominan,
    perWilker,
    hotspotPoints: (dataHotspot ?? []).map((b) => ({ latitude: b.latitude, longitude: b.longitude })),
    tren7Hari,
    skdrMingguIni: { label: `Mg ${mingguEpid}/${tahunEpid}`, totalKasus: totalSkdrIni },
    skdrMingguLalu: { label: `Mg ${mingguLaluEpid}/${tahunMingguLalu}`, totalKasus: totalSkdrLalu },
    skdrPerWilayah,
  };
}