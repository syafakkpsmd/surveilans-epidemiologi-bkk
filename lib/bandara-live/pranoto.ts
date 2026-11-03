// lib/bandara-live/pranoto.ts
import {
  getKedatanganAPT,
  getKeberangkatanAPT,
  ringkasKedatanganAPT,
  ringkasKeberangkatanAPT,
  type JadwalRingkasAPT,
} from '@/lib/aptpranoto';
import {
  getArrivalsByAirport,
  getDeparturesByAirport,
  ringkasKedatanganOpenSky,
  ringkasKeberangkatanOpenSky,
  KODE_ICAO_BANDARA,
} from '@/lib/opensky';

export interface HasilJadwalPranoto {
  kedatangan: JadwalRingkasAPT[];
  keberangkatan: JadwalRingkasAPT[];
  sumberData: 'resmi' | 'opensky' | 'campuran' | 'tidak_tersedia';
}

/**
 * Ambil jadwal APT Pranoto. Coba sumber resmi bandara dulu (lib/aptpranoto.ts);
 * kalau gagal (mis. situs bandara berubah struktur/endpoint mati), jatuhkan
 * ke OpenSky Network sebagai fallback (data pergerakan aktual, lebih terbatas
 * -- lihat catatan di lib/opensky.ts). kedatangan & keberangkatan difallback
 * SECARA TERPISAH, supaya kalau cuma satu yang gagal, yang satunya tetap
 * pakai data resmi.
 */
export async function ambilDataPranoto(): Promise<HasilJadwalPranoto> {
  const [kedatanganResmi, keberangkatanResmi] = await Promise.all([
    getKedatanganAPT().catch((err) => {
      console.error('[pranoto] Sumber resmi (kedatangan) gagal:', err);
      return null;
    }),
    getKeberangkatanAPT().catch((err) => {
      console.error('[pranoto] Sumber resmi (keberangkatan) gagal:', err);
      return null;
    }),
  ]);

  let kedatangan: JadwalRingkasAPT[] = kedatanganResmi ? ringkasKedatanganAPT(kedatanganResmi) : [];
  let keberangkatan: JadwalRingkasAPT[] = keberangkatanResmi ? ringkasKeberangkatanAPT(keberangkatanResmi) : [];

  let kedatanganPakaiOpensky = false;
  let keberangkatanPakaiOpensky = false;

  if (kedatanganResmi === null) {
    try {
      const fallback = await getArrivalsByAirport(KODE_ICAO_BANDARA.APT_PRANOTO, 12);
      kedatangan = ringkasKedatanganOpenSky(fallback);
      kedatanganPakaiOpensky = true;
    } catch (err) {
      console.error('[pranoto] Fallback OpenSky (kedatangan) juga gagal:', err);
    }
  }

  if (keberangkatanResmi === null) {
    try {
      const fallback = await getDeparturesByAirport(KODE_ICAO_BANDARA.APT_PRANOTO, 12);
      keberangkatan = ringkasKeberangkatanOpenSky(fallback);
      keberangkatanPakaiOpensky = true;
    } catch (err) {
      console.error('[pranoto] Fallback OpenSky (keberangkatan) juga gagal:', err);
    }
  }

  // Tentukan status sumber data keseluruhan utk ditampilkan di UI
  const resmiBerhasil = kedatanganResmi !== null || keberangkatanResmi !== null;
  const openskyDipakai = kedatanganPakaiOpensky || keberangkatanPakaiOpensky;
  const semuaGagalTotal =
    kedatanganResmi === null && keberangkatanResmi === null &&
    !kedatanganPakaiOpensky && !keberangkatanPakaiOpensky;

  let sumberData: HasilJadwalPranoto['sumberData'];
  if (semuaGagalTotal) sumberData = 'tidak_tersedia';
  else if (resmiBerhasil && openskyDipakai) sumberData = 'campuran';
  else if (openskyDipakai) sumberData = 'opensky';
  else sumberData = 'resmi';

  return { kedatangan, keberangkatan, sumberData };
}