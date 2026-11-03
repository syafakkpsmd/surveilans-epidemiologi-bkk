// src/lib/opensky.ts
// Integrasi OpenSky Network API (gratis, OAuth2 client credentials)
// Docs: https://openskynetwork.github.io/opensky-api/rest.html

const OPENSKY_AUTH_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_API_BASE = 'https://opensky-network.org/api';

type OpenSkyFlight = {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
};

// Cache token in module scope -- efektif selama Vercel function instance masih "warm",
// tidak dijamin persist antar cold start, tapi cukup mengurangi jumlah auth call.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getOpenSkyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET belum diset di environment variables'
    );
  }

  const res = await fetch(OPENSKY_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Gagal ambil token OpenSky: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // Token OpenSky biasanya berlaku ~30 menit; kita ambil margin 60 detik lebih awal
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

/**
 * Ambil daftar pesawat yang mendarat di sebuah bandara dalam rentang waktu tertentu.
 * @param icaoCode kode ICAO bandara, mis. 'WALS' (APT Pranoto), 'WALL' (Sepinggan)
 * @param hoursBack rentang jam ke belakang dari sekarang (default 6 jam, max ~2 hari per limit API)
 */
export async function getArrivalsByAirport(
  icaoCode: string,
  hoursBack = 6
): Promise<OpenSkyFlight[]> {
  return fetchFlights(icaoCode, 'arrival', hoursBack);
}

/**
 * Ambil daftar pesawat yang lepas landas dari sebuah bandara dalam rentang waktu tertentu.
 */
export async function getDeparturesByAirport(
  icaoCode: string,
  hoursBack = 6
): Promise<OpenSkyFlight[]> {
  return fetchFlights(icaoCode, 'departure', hoursBack);
}

async function fetchFlights(
  icaoCode: string,
  type: 'arrival' | 'departure',
  hoursBack: number
): Promise<OpenSkyFlight[]> {
  const token = await getOpenSkyToken();

  const end = Math.floor(Date.now() / 1000);
  const begin = end - hoursBack * 3600;

  const url = `${OPENSKY_API_BASE}/flights/${type}?airport=${icaoCode}&begin=${begin}&end=${end}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 }, // cache 60 detik di sisi Next.js, sesuaikan kebutuhan
  });

  if (res.status === 404) {
    // OpenSky return 404 kalau tidak ada penerbangan ditemukan di rentang waktu itu
    return [];
  }

  if (!res.ok) {
    throw new Error(`OpenSky API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Kode ICAO bandara yang relevan untuk project ini
export const KODE_ICAO_BANDARA = {
  APT_PRANOTO: 'WALS',
  SEPINGGAN: 'WALL',
} as const;

// ---------------------------------------------------------------------
// Konversi ke bentuk JadwalRingkasAPT -- dipakai sebagai FALLBACK saat
// sumber resmi bandara (lib/aptpranoto.ts) gagal/berubah struktur.
//
// PENTING -- keterbatasan data OpenSky dibanding sumber resmi FIDS bandara:
// - Ini data PERGERAKAN AKTUAL pesawat (dari sinyal ADS-B), BUKAN jadwal
//   terjadwal ke depan. Hanya penerbangan yang SUDAH mendarat/lepas landas
//   yang muncul di sini.
// - Tidak ada info gate, konter check-in, atau status real-time
//   ("Boarding", "Delayed", dll) -- OpenSky tidak tahu itu.
// - Nama kota & maskapai diterjemahkan dari kode ICAO bandara/callsign
//   pakai tabel referensi terbatas di bawah -- kalau kodenya tidak ada
//   di tabel, ditampilkan apa adanya (kode mentah) daripada menebak.
// ---------------------------------------------------------------------

// Tabel bandara: HANYA bandara besar berkode ICAO yang terdokumentasi publik.
// Sengaja tidak lengkap -- lebih aman tampilkan kode mentah drpd menebak salah.
const BANDARA_ICAO: Record<string, { kota: string; iata: string }> = {
  WIII: { kota: 'Jakarta', iata: 'CGK' },
  WARR: { kota: 'Surabaya', iata: 'SUB' },
  WAHI: { kota: 'Yogyakarta', iata: 'YIA' },
  WADD: { kota: 'Denpasar', iata: 'DPS' },
  WAOO: { kota: 'Banjarmasin', iata: 'BDJ' },
  WALK: { kota: 'Berau', iata: 'BEJ' },
  WALL: { kota: 'Balikpapan', iata: 'BPN' },
  WALS: { kota: 'Samarinda', iata: 'AAP' },
};

// Tabel maskapai: HANYA kode ICAO 3-huruf maskapai besar yang terdokumentasi
// publik & baku. Sengaja tidak mencakup operator kecil/charter regional --
// lebih aman tampilkan "Maskapai tidak diketahui" drpd menebak salah.
const MASKAPAI_ICAO: Record<string, string> = {
  GIA: 'Garuda Indonesia',
  BTK: 'Batik Air',
  CTV: 'Citilink',
  LNI: 'Lion Air',
  WON: 'Wings Air',
};

function formatJamWita(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar',
  });
}

function terjemahkanCallsign(callsign: string | null): { kodePenerbangan: string; namaMaskapai: string } {
  const bersih = (callsign ?? '').trim();
  if (!bersih) return { kodePenerbangan: '-', namaMaskapai: 'Maskapai tidak diketahui' };
  const prefiks = bersih.slice(0, 3).toUpperCase();
  return {
    kodePenerbangan: bersih,
    namaMaskapai: MASKAPAI_ICAO[prefiks] ?? 'Maskapai tidak diketahui',
  };
}

/** Konversi hasil getArrivalsByAirport() -> bentuk JadwalRingkasAPT (fallback). */
export function ringkasKedatanganOpenSky(data: OpenSkyFlight[]): {
  id: string; jam: string; kodePenerbangan: string; namaMaskapai: string;
  logoMaskapai: string; status: string; kota: string; iata: string; kategori: 'landed';
}[] {
  return data
    .filter((f) => f.lastSeen != null)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map((f) => {
      const { kodePenerbangan, namaMaskapai } = terjemahkanCallsign(f.callsign);
      const asal = f.estDepartureAirport ? BANDARA_ICAO[f.estDepartureAirport] : undefined;
      return {
        id: `${f.icao24}-${f.lastSeen}`,
        jam: formatJamWita(f.lastSeen),
        kodePenerbangan,
        namaMaskapai,
        logoMaskapai: '',
        status: 'Sudah Mendarat',
        kota: asal?.kota ?? (f.estDepartureAirport ?? 'Tidak diketahui'),
        iata: asal?.iata ?? '-',
        kategori: 'landed' as const,
      };
    });
}

/** Konversi hasil getDeparturesByAirport() -> bentuk JadwalRingkasAPT (fallback). */
export function ringkasKeberangkatanOpenSky(data: OpenSkyFlight[]): {
  id: string; jam: string; kodePenerbangan: string; namaMaskapai: string;
  logoMaskapai: string; status: string; kota: string; iata: string; kategori: 'landed';
}[] {
  return data
    .filter((f) => f.firstSeen != null)
    .sort((a, b) => b.firstSeen - a.firstSeen)
    .map((f) => {
      const { kodePenerbangan, namaMaskapai } = terjemahkanCallsign(f.callsign);
      const tujuan = f.estArrivalAirport ? BANDARA_ICAO[f.estArrivalAirport] : undefined;
      return {
        id: `${f.icao24}-${f.firstSeen}`,
        jam: formatJamWita(f.firstSeen),
        kodePenerbangan,
        namaMaskapai,
        logoMaskapai: '',
        status: 'Sudah Lepas Landas',
        kota: tujuan?.kota ?? (f.estArrivalAirport ?? 'Tidak diketahui'),
        iata: tujuan?.iata ?? '-',
        kategori: 'landed' as const,
      };
    });
}

/**
 * Diagnostik: cek apakah ada pesawat terdeteksi OpenSky di suatu area (bounding box)
 * saat ini, TANPA bergantung pada estimasi bandara asal/tujuan.
 * Berguna untuk membedakan "memang tidak ada receiver di area ini"
 * vs "receiver ada, tapi estimasi bandaranya yang gagal".
 */
export async function cekCoverageWilayah(bbox: {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}) {
  const token = await getOpenSkyToken();

  const params = new URLSearchParams({
    lamin: String(bbox.latMin),
    lamax: String(bbox.latMax),
    lomin: String(bbox.lonMin),
    lomax: String(bbox.lonMax),
  });

  const res = await fetch(`${OPENSKY_API_BASE}/states/all?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`OpenSky states/all error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}