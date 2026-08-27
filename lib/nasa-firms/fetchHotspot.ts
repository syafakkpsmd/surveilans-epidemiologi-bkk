/**
 * Integrasi NASA FIRMS Area API untuk hotspot Kalimantan Timur.
 * Dokumentasi resmi: https://firms.modaps.eosdis.nasa.gov/api/area/
 *
 * PENTING soal confidence:
 * - source "MODIS_NRT"        -> confidence NUMERIK 0-100 (bisa difilter >80 langsung)
 * - source "VIIRS_SNPP_NRT"   -> confidence KATEGORIKAL 'l'|'n'|'h' (low/nominal/high)
 *   VIIRS resolusinya lebih tinggi (375m vs 1km MODIS) jadi lebih akurat untuk titik
 *   kecil, tapi tidak punya angka confidence. Kita treat 'h' sebagai setara >80%.
 *
 * Butuh MAP_KEY gratis: daftar di
 * https://firms.modaps.eosdis.nasa.gov/api/area/ (klik "Get MAP_KEY")
 * simpan sebagai env var NASA_FIRMS_MAP_KEY (server-side only, jangan expose ke client).
 */

// Bounding box Kalimantan Timur (west,south,east,north) - sedikit dilebarkan
// agar hotspot di perbatasan provinsi tetap tertangkap.
export const BBOX_KALTIM = '113.0,-3.0,119.5,3.0' as const;

export type SourceFirms = 'MODIS_NRT' | 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'VIIRS_NOAA21_NRT';

export interface HotspotFirms {
  latitude: number;
  longitude: number;
  tanggalDeteksi: string;   // YYYY-MM-DD
  jamDeteksi: string;       // HHMM (UTC) mentah dari FIRMS
  confidence: number;       // dinormalisasi ke 0-100 supaya konsisten di DB
  confidenceAsli: string;   // nilai mentah (angka string atau 'l'/'n'/'h')
  satelit: string;
  frp: number | null;
  sumberSource: SourceFirms;
}

function normalisasiConfidence(raw: string, source: SourceFirms): number {
  // MODIS: raw sudah berupa angka string "0".."100"
  if (source === 'MODIS_NRT') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  // VIIRS: kategorikal -> mapping ke skala 0-100 agar bisa disimpan & difilter seragam
  switch (raw.trim().toLowerCase()) {
    case 'h': return 90; // high
    case 'n': return 50; // nominal
    case 'l': return 10; // low
    default: return 0;
  }
}

/** Parser CSV sederhana untuk response FIRMS (tanpa dependency eksternal). */
function parseCsvFirms(csvText: string, source: SourceFirms): HotspotFirms[] {
  const baris = csvText.trim().split('\n');
  if (baris.length <= 1) return []; // hanya header / kosong

  const header = baris[0].split(',').map((h) => h.trim());
  const idx = (nama: string) => header.indexOf(nama);

  const iLat = idx('latitude');
  const iLon = idx('longitude');
  const iTanggal = idx('acq_date');
  const iJam = idx('acq_time');
  const iConf = idx('confidence');
  const iSat = idx('satellite');
  const iFrp = idx('frp');

  if (iLat === -1 || iLon === -1 || iTanggal === -1) {
    throw new Error(`Format CSV FIRMS tidak dikenali. Header: ${header.join(',')}`);
  }

  const hasil: HotspotFirms[] = [];
  for (let i = 1; i < baris.length; i++) {
    const kol = baris[i].split(',');
    if (kol.length < header.length) continue; // baris rusak/kosong

    const confAsli = iConf !== -1 ? kol[iConf] : '0';
    hasil.push({
      latitude: Number(kol[iLat]),
      longitude: Number(kol[iLon]),
      tanggalDeteksi: kol[iTanggal],
      jamDeteksi: iJam !== -1 ? kol[iJam] : '',
      confidence: normalisasiConfidence(confAsli, source),
      confidenceAsli: confAsli,
      satelit: iSat !== -1 ? kol[iSat] : source,
      frp: iFrp !== -1 && kol[iFrp] !== '' ? Number(kol[iFrp]) : null,
      sumberSource: source,
    });
  }
  return hasil;
}

export interface AmbilHotspotOpsi {
  /** default MODIS_NRT karena confidence-nya numerik, sesuai kebutuhan filter >80% */
  source?: SourceFirms;
  /** jumlah hari ke belakang (FIRMS Area API max 10 hari per request), default 1 */
  dayRange?: number;
  /** ambang batas confidence minimum (0-100), default 80 */
  confidenceMin?: number;
  /** bounding box custom, default Kaltim */
  bbox?: string;
}

/**
 * Ambil data hotspot dari NASA FIRMS untuk wilayah Kaltim,
 * sudah difilter confidence >= confidenceMin (default 80).
 *
 * Panggil ini HANYA dari server (API route / server action) -
 * MAP_KEY tidak boleh terekspos ke client.
 */
export async function ambilHotspotKaltim(
  opsi: AmbilHotspotOpsi = {}
): Promise<HotspotFirms[]> {
  const {
    source = 'MODIS_NRT',
    dayRange = 1,
    confidenceMin = 80,
    bbox = BBOX_KALTIM,
  } = opsi;

  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    throw new Error(
      'NASA_FIRMS_MAP_KEY belum di-set di environment variables. ' +
      'Daftar gratis di https://firms.modaps.eosdis.nasa.gov/api/area/'
    );
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${dayRange}`;

  let response: Response;
  try {
    response = await fetch(url, {
      // FIRMS data update per ~3 jam untuk NRT; cache 1 jam cukup aman
      next: { revalidate: 3600 },
    });
  } catch (err) {
    const errorAsli = err as Error & { cause?: unknown };
    const detailCause = errorAsli.cause ? ` | Penyebab: ${String(errorAsli.cause)}` : '';
    throw new Error(
      `Gagal menghubungi NASA FIRMS API: ${errorAsli.message}${detailCause}. ` +
      `Kemungkinan jaringan/firewall kantor memblokir domain firms.modaps.eosdis.nasa.gov, ` +
      `atau tidak ada koneksi internet keluar dari server ini.`
    );
  }

  if (!response.ok) {
    const teks = await response.text().catch(() => '');
    throw new Error(
      `NASA FIRMS API mengembalikan status ${response.status}. ` +
      `Kemungkinan MAP_KEY tidak valid, sudah expired, atau kuota harian habis. ` +
      `Detail: ${teks.slice(0, 200)}`
    );
  }

  const csvText = await response.text();

  // FIRMS mengembalikan HTTP 200 dengan pesan error di body untuk beberapa
  // kasus (mis. MAP_KEY invalid) - deteksi ini secara eksplisit.
  if (csvText.toLowerCase().includes('invalid') || csvText.toLowerCase().includes('error')) {
    throw new Error(`NASA FIRMS API mengembalikan pesan error: ${csvText.slice(0, 200)}`);
  }

  const semuaTitik = parseCsvFirms(csvText, source);

  return semuaTitik.filter((titik) => titik.confidence >= confidenceMin);
}