import { NAMA_WILKER } from '@/lib/karhutla/constants';
import { WILKER_LOKASI } from '@/lib/data/wilker-lokasi';

/**
 * PEMETAAN LOKASI KUALITAS UDARA -> KODE WILKER
 * -----------------------------------------------
 * Modul ISPA (kode_wilker/zona) dan modul Kualitas Udara (lokasi bebas teks,
 * dikelola admin lewat /dashboard/pengaturan-lokasi-karhutla) memang punya
 * taksonomi berbeda secara struktur tabel -- TIDAK ada foreign key di
 * database yang menghubungkan keduanya (lihat catatan di
 * queries-karhutla-server.ts: ambilTrenIspaPm25).
 *
 * Tapi secara substansi keduanya mengacu ke wilayah kerja BKK yang sama --
 * hanya beda penamaan karena satu sisi penamaannya berbasis klinik, sisi
 * lain berbasis pelabuhan/bandara (mis. "APT Pranoto (Kedatangan)" untuk
 * kualitas udara vs "Klinik APT Pranoto" untuk ISPA, keduanya WK07).
 *
 * Karena tidak ada join key di DB, pemetaan di bawah ini dilakukan lewat
 * pencocokan kata kunci nama wilayah (case-insensitive, substring match).
 * Ini CUKUP untuk kebutuhan breakdown per-wilayah di Info Grafis, tapi
 * kalau admin menambah lokasi baru dengan nama yang jauh berbeda dari
 * daftar di bawah, lokasi itu akan jatuh ke bucket "Tidak Terpetakan" --
 * sengaja begitu (dianggap "tidak ada data" utk wilayah itu) daripada
 * salah petakan ke wilker yang keliru.
 */
const KATA_KUNCI_WILKER: { kode_wilker: string; kataKunci: string[] }[] = [
  { kode_wilker: 'WK01', kataKunci: ['samarinda', 'palaran', 'sidomulyo'] },
  { kode_wilker: 'WK02', kataKunci: ['tanjung santan'] },
  { kode_wilker: 'WK03', kataKunci: ['tanjung laut'] },
  { kode_wilker: 'WK04', kataKunci: ['lhoktuan', 'lhok tuan'] },
  { kode_wilker: 'WK05', kataKunci: ['sangatta'] },
  { kode_wilker: 'WK06', kataKunci: ['sangkulirang'] },
  { kode_wilker: 'WK07', kataKunci: ['pranoto'] },
];

/** Cocokkan nama lokasi kualitas udara (mis. "APT Pranoto (Kedatangan)") ke kode_wilker. */
export function petakanLokasiUdaraKeWilker(lokasi: string): string | null {
  const teks = lokasi.toLowerCase();
  for (const entri of KATA_KUNCI_WILKER) {
    if (entri.kataKunci.some((k) => teks.includes(k))) return entri.kode_wilker;
  }
  return null;
}

/**
 * PEMETAAN TITIK HOTSPOT -> KODE WILKER TERDEKAT
 * -----------------------------------------------
 * Tabel hotspot_nasa_kaltim cuma punya lat/lng (dari NASA FIRMS), tidak
 * ada kode_wilker sama sekali. Untuk breakdown per-wilayah, tiap titik
 * hotspot didekatkan ke wilker dengan jarak garis-lurus (haversine)
 * terpendek dari titik pusat wilker (lib/data/wilker-lokasi.ts).
 *
 * Ini estimasi kasar utk kebutuhan info grafis publik (menunjukkan wilayah
 * mana yang paling terdampak) -- BUKAN untuk keputusan operasional presisi
 * (mis. penentuan batas administratif kabupaten/kota).
 */
function jarakHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function cariWilkerTerdekatDariTitik(lat: number, lng: number): string {
  let terdekat = WILKER_LOKASI[0];
  let jarakTerdekat = Infinity;
  for (const w of WILKER_LOKASI) {
    const jarak = jarakHaversineKm(lat, lng, w.pusat.lat, w.pusat.lng);
    if (jarak < jarakTerdekat) {
      jarakTerdekat = jarak;
      terdekat = w;
    }
  }
  return terdekat.kode;
}

/** Daftar 7 wilker urut kode, dipakai utk breakdown grid di Info Grafis. */
export const DAFTAR_KODE_WILKER = Object.keys(NAMA_WILKER).sort();

/** Tanggal "hari ini" menurut WITA (UTC+8), format YYYY-MM-DD. Konsisten
 * dengan lib/ai/periode.ts (rentangHariIniWita) -- Kaltim pakai WITA,
 * BUKAN WIB, jadi tidak boleh pakai Date.toISOString() polos (itu UTC). */
export function tanggalWitaHariIni(sekarang: Date = new Date()): string {
  const OFFSET_WITA_MS = 8 * 60 * 60 * 1000;
  const waktuWita = new Date(sekarang.getTime() + OFFSET_WITA_MS);
  return waktuWita.toISOString().slice(0, 10);
}

/** Mundurkan tanggal (format YYYY-MM-DD) sejumlah hari. */
export function mundurkanTanggal(tanggal: string, jumlahHari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - jumlahHari);
  return d.toISOString().slice(0, 10);
}
