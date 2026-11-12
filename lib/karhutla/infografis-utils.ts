import { kunciNama, type Wilayah } from '@/lib/wilayah-kerja';


/** Label ringkas lokasi: bila berformat "Wilayah (Titik)", tampilkan "Titik". Selain itu tampil apa adanya. */
export function labelTampilanLokasi(lokasi: string): string {
  const m = lokasi.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : lokasi;
}


/**
 * Cocokkan nama lokasi kualitas udara ke kode wilker berdasarkan master (nama, nama pendek, nama peta, alias,
 * sub-lokasi yang khas). Kandidat terpanjang menang. Bandara yang punya induk dipetakan ke induknya.
 * Sub-lokasi yang sama di lebih dari satu wilayah (mis. "Pelabuhan Umum") diabaikan agar tidak salah petak.
 */
export function petakanLokasiUdaraKeWilker(lokasi: string, wilayah: readonly Wilayah[]): string | null {
  const teks = kunciNama(lokasi);

  const pemakaianSub = new Map<string, number>();
  for (const w of wilayah) {
    for (const s of new Set(w.subLokasi.map(kunciNama))) pemakaianSub.set(s, (pemakaianSub.get(s) ?? 0) + 1);
  }

  let terbaik: { kode: string; panjang: number } | null = null;
  for (const w of wilayah) {
    if (w.jenis === 'Kantor') continue;
    const kandidat = [
      w.namaPendek,
      w.nama,
      w.namaPeta,
      ...w.alias,
      ...w.subLokasi.filter((s) => pemakaianSub.get(kunciNama(s)) === 1),
    ];
    for (const k of kandidat) {
      const kk = kunciNama(k);
      if (kk.length >= 4 && teks.includes(kk) && (!terbaik || kk.length > terbaik.panjang)) {
        terbaik = { kode: w.indukKode ?? w.kode, panjang: kk.length };
      }
    }
  }
  return terbaik?.kode ?? null;
}

/**
 * PEMETAAN TITIK HOTSPOT -> KODE WILKER TERDEKAT
 * -----------------------------------------------
 * Tabel hotspot_nasa_kaltim cuma punya lat/lng (dari NASA FIRMS), tidak
 * ada kode_wilker sama sekali. Untuk breakdown per-wilayah, tiap titik
 * hotspot didekatkan ke wilker dengan jarak garis-lurus (haversine)
 * terpendek dari titik pusat wilker (peta_lat/peta_lng di wilker_ref).
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

/** Titik hotspot lebih jauh dari ini (km) dianggap di luar wilayah kerja
 *  BKK sama sekali -- tidak dipaksa masuk ke wilker manapun. Nilai ini
 *  konservatif (lebih lebar dari radius kabupaten terkecil) supaya titik
 *  yang genuinely dekat tetap tertangkap, tapi titik lintas-provinsi
 *  (mis. Kalteng/Kalsel) tidak salah dihitung sebagai milik Samarinda dst. */
const JARAK_MAKS_WILKER_KM = 100;

/** `wilayah` = pusat tiap wilayah kerja (dari opsiWilkerPeta, tanpa kantor induk). */
export function cariWilkerTerdekatDariTitik(
  lat: number,
  lng: number,
  wilayah: readonly { kode: string; pusat: { lat: number; lng: number } }[]
): string | null {
  if (wilayah.length === 0) return null;
  let terdekat = wilayah[0];
  let jarakTerdekat = Infinity;
  for (const w of wilayah) {
    const jarak = jarakHaversineKm(lat, lng, w.pusat.lat, w.pusat.lng);
    if (jarak < jarakTerdekat) {
      jarakTerdekat = jarak;
      terdekat = w;
    }
  }
  return jarakTerdekat <= JARAK_MAKS_WILKER_KM ? terdekat.kode : null;
}

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
