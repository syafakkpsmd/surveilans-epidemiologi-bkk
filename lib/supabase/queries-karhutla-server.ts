import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * HANYA untuk dipanggil dari Server Component / Route Handler / Server Action.
 * Jangan pernah import file ini dari komponen yang ada 'use client'.
 */

/**
 * wilayahKey: gabungan "kode_wilker" atau "kode_wilker::zona" (mis. "WK01::Palaran").
 * "Semua" atau undefined = tanpa filter (gabungan semua wilayah).
 *
 * CATATAN: PM2.5 sekarang berasal dari tabel kualitas_udara_harian yang punya
 * taksonomi lokasi berbeda (8 lokasi) dari kode_wilker/zona ISPA (13 wilayah).
 * Karena tidak ada mapping 1:1, PM2.5 ditampilkan sebagai rerata REGIONAL
 * (gabungan semua lokasi) — konsisten dengan pola hotspot yang sudah regional juga.
 */
export async function ambilTrenIspaPm25(opsi: { wilayahKey?: string; hariTerakhir?: number } = {}) {
  const { wilayahKey, hariTerakhir = 30 } = opsi;
  const supabase = await createClient();

  const sejakTanggal = new Date();
  sejakTanggal.setDate(sejakTanggal.getDate() - hariTerakhir);
  const tanggalAwal = sejakTanggal.toISOString().slice(0, 10);

  let queryIspa = supabase
    .from('ispa_harian')
    .select('tanggal, kode_wilker, zona, kasus_ispa_anak, kasus_ispa_dewasa')
    .gte('tanggal', tanggalAwal)
    .order('tanggal', { ascending: true });

  const isFilterSemua = !wilayahKey || wilayahKey === 'Semua';
  if (!isFilterSemua) {
    const [kodeWilker, zona] = wilayahKey.split('::');
    queryIspa = queryIspa.eq('kode_wilker', kodeWilker);
    queryIspa = zona ? queryIspa.eq('zona', zona) : queryIspa.is('zona', null);
  }

  const [{ data: dataIspa, error: errIspa }, { data: dataUdara, error: errUdara }] = await Promise.all([
    queryIspa,
    supabase
      .from('kualitas_udara_harian')
      .select('tanggal, pm25')
      .gte('tanggal', tanggalAwal)
      .order('tanggal', { ascending: true }),
  ]);

  if (errIspa) throw new Error(`Gagal mengambil tren ISPA: ${errIspa.message}`);
  if (errUdara) throw new Error(`Gagal mengambil data PM2.5: ${errUdara.message}`);

  // Rerata PM2.5 regional per tanggal (gabungan semua lokasi)
  const mapPm25 = new Map<string, { total: number; jml: number }>();
  for (const baris of dataUdara ?? []) {
    if (baris.pm25 == null) continue;
    const entri = mapPm25.get(baris.tanggal) ?? { total: 0, jml: 0 };
    entri.total += Number(baris.pm25);
    entri.jml += 1;
    mapPm25.set(baris.tanggal, entri);
  }
  const pm25PerTanggal = (tanggal: string) => {
    const e = mapPm25.get(tanggal);
    return e && e.jml > 0 ? Number((e.total / e.jml).toFixed(1)) : null;
  };

  if (!dataIspa) return [];

  // Rekap kasus ISPA per tanggal (kalau gabungan banyak wilker, dijumlahkan)
  const mapIspa = new Map<string, { kasus_ispa_anak: number; kasus_ispa_dewasa: number }>();
  for (const baris of dataIspa) {
    const entri = mapIspa.get(baris.tanggal) ?? { kasus_ispa_anak: 0, kasus_ispa_dewasa: 0 };
    entri.kasus_ispa_anak += baris.kasus_ispa_anak;
    entri.kasus_ispa_dewasa += baris.kasus_ispa_dewasa;
    mapIspa.set(baris.tanggal, entri);
  }

  return Array.from(mapIspa.entries()).map(([tanggal, e]) => ({
    tanggal,
    kasus_ispa_anak: e.kasus_ispa_anak,
    kasus_ispa_dewasa: e.kasus_ispa_dewasa,
    pm25_rerata: pm25PerTanggal(tanggal),
  }));
}

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
// dikelola superadmin. Ini menggantikan DAFTAR_WILAYAH_KARHUTLA
// dan LOKASI_KUALITAS_UDARA yang tadinya hardcoded di constants.ts.
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
  pm25Rerata: number | null; // regional, lihat catatan di bawah
  jumlahHotspot: number;
}

export interface OpsiPerbandinganIspaHotspot {
  granularitas: 'mingguan' | 'bulanan';
  tahun: number;
  periodeAwal: number;
  periodeAkhir: number;
  /** 'Semua' | 'WK0X' | 'WK0X::zona' - biarkan kosong/'Semua' untuk gabungan semua wilayah */
  wilayahKey?: string;
}

/**
 * CATATAN PENTING: filter wilayahKey HANYA berlaku untuk data kasus ISPA.
 * PM2.5 selalu diambil sebagai rerata regional Kaltim (dari view_kualitas_udara_*),
 * karena taksonomi lokasi kualitas udara (8 titik) berbeda dari kode_wilker/zona
 * ISPA (13 wilayah) dan belum ada mapping 1:1 di antara keduanya.
 *
 * CATATAN TEKNIS: mingguan vs bulanan SENGAJA ditulis sebagai 2 blok kode terpisah
 * (bukan diparameterisasi pakai variabel nama tabel/kolom) karena view mingguan
 * pakai kolom tahun_epid/minggu_epid sedangkan view bulanan pakai tahun/bulan.
 * Kalau nama tabel/kolom disimpan sebagai variabel string biasa lalu dipakai di
 * .from()/.eq(), TypeScript cuma mengizinkan kolom yang sama-sama ada di kedua
 * view (irisan) — sehingga tahun_epid/minggu_epid dan tahun/bulan otomatis
 * tertolak karena tidak ada di keduanya sekaligus. Trade-off: kode agak duplikat,
 * tapi types tetap aman & akurat.
 */
export async function ambilPerbandinganIspaHotspot(
  opsi: OpsiPerbandinganIspaHotspot
): Promise<TitikPerbandinganIspaHotspot[]> {
  const { granularitas, tahun, periodeAwal, periodeAkhir, wilayahKey } = opsi;
  const supabase = await createClient();

  const isSemua = !wilayahKey || wilayahKey === 'Semua';
  let kodeWilkerFilter: string | null = null;
  let zonaFilter: string | null = null;
  if (!isSemua) {
    const [kw, z] = wilayahKey.split('::');
    kodeWilkerFilter = kw;
    zonaFilter = z ?? null;
  }

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
    if (kodeWilkerFilter) {
      queryIspa = queryIspa.eq('kode_wilker', kodeWilkerFilter);
      queryIspa = zonaFilter ? queryIspa.eq('zona', zonaFilter) : queryIspa.is('zona', null);
    }

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
    if (kodeWilkerFilter) {
      queryIspa = queryIspa.eq('kode_wilker', kodeWilkerFilter);
      queryIspa = zonaFilter ? queryIspa.eq('zona', zonaFilter) : queryIspa.is('zona', null);
    }

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
// Data mentah untuk halaman tabel (bukan agregat) - dipakai
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
    .select('id, tanggal, lokasi, pm25, pm10, suhu, hcho, tvoc, kelembapan, ispu_status, status_evaluasi, catatan_evaluasi')
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
}

export interface OpsiTrenHarianRentang {
  tanggalAwal: string; // YYYY-MM-DD
  tanggalAkhir: string; // YYYY-MM-DD
  wilayahKey?: string; // 'Semua' | 'WK0X' | 'WK0X::zona'
  parameterUdara?: ParameterUdara; // default 'pm25'
}

export async function ambilTrenHarianRentang(
  opsi: OpsiTrenHarianRentang
): Promise<TitikTrenHarianRentang[]> {
  const { tanggalAwal, tanggalAkhir, wilayahKey, parameterUdara = 'pm25' } = opsi;
  const supabase = await createClient();

  let queryIspa = supabase
    .from('ispa_harian')
    .select('tanggal, kode_wilker, zona, kasus_ispa_anak, kasus_ispa_dewasa')
    .gte('tanggal', tanggalAwal)
    .lte('tanggal', tanggalAkhir)
    .order('tanggal', { ascending: true });

  const isFilterSemua = !wilayahKey || wilayahKey === 'Semua';
  if (!isFilterSemua) {
    const [kodeWilker, zona] = wilayahKey.split('::');
    queryIspa = queryIspa.eq('kode_wilker', kodeWilker);
    queryIspa = zona ? queryIspa.eq('zona', zona) : queryIspa.is('zona', null);
  }

  const [{ data: dataIspa, error: errIspa }, { data: dataUdara, error: errUdara }] = await Promise.all([
    queryIspa,
    supabase
      .from('kualitas_udara_harian')
      .select(`tanggal, ${parameterUdara}`)
      .gte('tanggal', tanggalAwal)
      .lte('tanggal', tanggalAkhir)
      .order('tanggal', { ascending: true }),
  ]);

  if (errIspa) throw new Error(`Gagal mengambil data ISPA: ${errIspa.message}`);
  if (errUdara) throw new Error(`Gagal mengambil data kualitas udara: ${errUdara.message}`);

  // Rerata regional per tanggal untuk parameter udara yang dipilih
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

  // Rekap kasus ISPA per tanggal
  const mapIspa = new Map<string, { anak: number; dewasa: number }>();
  for (const baris of dataIspa ?? []) {
    const entri = mapIspa.get(baris.tanggal) ?? { anak: 0, dewasa: 0 };
    entri.anak += baris.kasus_ispa_anak;
    entri.dewasa += baris.kasus_ispa_dewasa;
    mapIspa.set(baris.tanggal, entri);
  }

  // Susun deret tanggal lengkap (termasuk hari tanpa data, biar grafik tidak bolong)
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
    });
    kursor.setDate(kursor.getDate() + 1);
  }

  return hasil;
}