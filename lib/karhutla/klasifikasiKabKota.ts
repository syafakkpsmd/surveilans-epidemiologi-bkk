// ================================================================
// lib/karhutla/klasifikasiKabKota.ts
//
// Mengelompokkan koordinat (lat, lon) ke kabupaten/kota terdekat di
// Kalimantan Timur, berdasarkan jarak ke titik pusat (ibu kota)
// masing-masing kab/kota -- BUKAN batas administratif presisi
// (tidak pakai poligon resmi). Cukup akurat untuk kebutuhan rekap
// pemantauan karena kab/kota di Kaltim luas & titik hotspot jarang
// tepat di garis batas.
//
// Disertakan juga beberapa titik acuan provinsi tetangga, supaya
// hotspot yang jelas-jelas berada di luar Kaltim (mis. terbawa dari
// query bounding-box NASA FIRMS yang sedikit melebar) tidak dipaksa
// masuk ke salah satu kab/kota Kaltim.
// ================================================================

type Acuan = { nama: string; lat: number; lon: number; diKaltim: boolean };

const ACUAN_KAB_KOTA: Acuan[] = [
  // --- 10 kabupaten/kota Kalimantan Timur (titik ibu kota/pusat) ---
  { nama: 'Kota Samarinda', lat: -0.5022, lon: 117.1536, diKaltim: true },
  { nama: 'Kota Balikpapan', lat: -1.2379, lon: 116.8529, diKaltim: true },
  { nama: 'Kota Bontang', lat: 0.1324, lon: 117.4855, diKaltim: true },
  { nama: 'Kab. Kutai Kartanegara', lat: -0.4028, lon: 117.0117, diKaltim: true },
  { nama: 'Kab. Kutai Timur', lat: 0.5000, lon: 117.5667, diKaltim: true },
  { nama: 'Kab. Kutai Barat', lat: -0.5500, lon: 115.8500, diKaltim: true },
  { nama: 'Kab. Mahakam Ulu', lat: 0.9000, lon: 114.9000, diKaltim: true },
  { nama: 'Kab. Berau', lat: 2.1667, lon: 117.5000, diKaltim: true },
  { nama: 'Kab. Paser', lat: -1.9000, lon: 116.2000, diKaltim: true },
  { nama: 'Kab. Penajam Paser Utara', lat: -1.2167, lon: 116.7333, diKaltim: true },
  // --- acuan kasar provinsi tetangga, hanya penampung "di luar Kaltim" ---
  { nama: 'Luar Kaltim (Kalimantan Tengah)', lat: -1.5, lon: 113.3, diKaltim: false },
  { nama: 'Luar Kaltim (Kalimantan Selatan)', lat: -3.3, lon: 115.3, diKaltim: false },
  { nama: 'Luar Kaltim (Kalimantan Utara)', lat: 3.3, lon: 117.2, diKaltim: false },
];

function jarakKuadrat(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Jarak Euclidean sederhana di ruang lat/lon cukup untuk perbandingan
  // "mana yang terdekat" pada cakupan sekecil satu provinsi.
  const dLat = lat1 - lat2;
  const dLon = lon1 - lon2;
  return dLat * dLat + dLon * dLon;
}

export function klasifikasiKabKota(lat: number, lon: number): string {
  let terdekat = ACUAN_KAB_KOTA[0];
  let jarakTerdekat = Infinity;
  for (const a of ACUAN_KAB_KOTA) {
    const j = jarakKuadrat(lat, lon, a.lat, a.lon);
    if (j < jarakTerdekat) {
      jarakTerdekat = j;
      terdekat = a;
    }
  }
  return terdekat.nama;
}

export const CATATAN_METODE_KLASIFIKASI =
  'Pengelompokan kabupaten/kota berdasarkan jarak terdekat ke pusat wilayah (estimasi), bukan batas administratif resmi.';
