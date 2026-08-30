// src/lib/aptpranoto.ts
// Integrasi endpoint publik resmi APT Pranoto Airport (aptpairport.id)
//
// RIWAYAT: situs resminya di-rebuild total ke "AIAIS Portal v2.0.0" (~Agustus 2026).
// Endpoint lama yang diasumsikan di sini sebelumnya (/api/arrivals, /api/departures,
// bentuk {success, data:[...]}) SUDAH TIDAK ADA -- itu sebabnya papan jadwal sempat
// kosong ("Menunggu integrasi sumber data"). Endpoint yang benar sekarang dikonfirmasi
// via DevTools Network tab (tab Jaringan > Fetch/XHR) langsung dari halaman publik
// https://aptpairport.id/flights pada 30 Agustus 2026:
//
//   GET https://aptpairport.id/api/v2/flights
//   -> { success, message, data: { flights: [...] } }
//
// Satu array 'flights' berisi GABUNGAN kedatangan & keberangkatan (dibedakan lewat
// field flight_type: 'arrival' | 'departure'), dan mencakup lebih dari satu tanggal
// (hari ini + beberapa hari ke belakang) -- karena itu kita filter ke tanggal hari
// ini (WITA) di sisi kita sebelum ditampilkan.
//
// CATATAN: ini tetap endpoint tidak resmi/tidak didokumentasikan publik oleh pihak
// bandara, jadi bisa berubah lagi sewaktu-waktu tanpa pemberitahuan. Selalu bungkus
// dengan try-catch dan pertahankan fallback OpenSky (lib/opensky.ts) kalau endpoint
// ini gagal/berubah struktur lagi.

const APT_PRANOTO_FLIGHTS_URL = 'https://aptpairport.id/api/v2/flights';

type FlightTypeAPT = 'arrival' | 'departure';

// Nilai 'status' mentah yang teramati dari API (mesin-terbaca, buat pemetaan kategori).
// Daftar ini tidak dijamin lengkap -- kalau ada nilai baru yang tidak dikenal,
// kategoriStatus() jatuh ke 'ontime' drpd menebak salah.
type StatusMentahAPT =
  | 'scheduled'
  | 'check_in'
  | 'boarding'
  | 'gate_closed'
  | 'landed'
  | 'departed'
  | 'delayed'
  | 'cancelled'
  | (string & {});

export type FlightAPT = {
  id: string; // mis. "arr_1878", "dep_1857"
  flight_number: string;
  airline: string;
  airline_logo: string; // URL absolut lengkap, siap pakai langsung
  airline_code: string;
  airline_color: string;
  origin: string; // mis. "Juanda (SUB)"
  destination: string; // mis. "Samarinda (AAP)"
  origin_city: string;
  destination_city: string;
  flight_date: string; // "YYYY-MM-DD"
  scheduled_time: string; // mis. "09:35 WITA"
  estimated_time: string | null;
  terminal: string | null;
  gate: string | null;
  baggage_belt: number | null;
  checkin_counters: number[];
  flight_type: FlightTypeAPT;
  status: StatusMentahAPT;
  remarks: string; // mis. "Arrived", "Scheduled", "Gate Open", "Cancelled" -- teks siap tampil
  delay_reason: string | null;
  note: string | null;
  updated_at: string;
};

type ResponseFlightsAPT = {
  success: boolean;
  message?: string;
  data: { flights: FlightAPT[] };
};

async function fetchSemuaFlightsAPT(): Promise<FlightAPT[]> {
  const res = await fetch(APT_PRANOTO_FLIGHTS_URL, {
    next: { revalidate: 60 }, // cache 60 detik -- data ini update per menit di sumbernya
  });

  if (!res.ok) {
    throw new Error(`APT Pranoto API error (flights): ${res.status} ${res.statusText}`);
  }

  const json: ResponseFlightsAPT = await res.json();

  if (!json.success) {
    throw new Error('APT Pranoto API mengembalikan success: false (flights)');
  }

  return json.data.flights;
}

/** Tanggal hari ini dalam format "YYYY-MM-DD", di zona waktu WITA -- supaya cocok dengan field flight_date dari API, terlepas dari zona waktu server yang menjalankan kode ini. */
function tanggalHariIniWITA(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
}

export async function getKedatanganAPT(): Promise<FlightAPT[]> {
  const semua = await fetchSemuaFlightsAPT();
  const hariIni = tanggalHariIniWITA();
  return semua.filter((f) => f.flight_type === 'arrival' && f.flight_date === hariIni);
}

export async function getKeberangkatanAPT(): Promise<FlightAPT[]> {
  const semua = await fetchSemuaFlightsAPT();
  const hariIni = tanggalHariIniWITA();
  return semua.filter((f) => f.flight_type === 'departure' && f.flight_date === hariIni);
}

// ---------------------------------------------------------------------
// Helper kota/IATA & status
// ---------------------------------------------------------------------

/** Ekstrak kode IATA dari string rute API, mis. "Juanda (SUB)" -> "SUB". */
function ekstrakIATA(namaBandara: string): string {
  const m = namaBandara.match(/\(([A-Z0-9-]+)\)\s*$/);
  return m ? m[1] : '-';
}

export type KategoriStatus = 'landed' | 'delayed' | 'boarding' | 'ontime';

/** Pemetaan dari 'status' mentah API (mesin-terbaca) ke kategori warna badge UI. */
export function kategoriStatus(status: string): KategoriStatus {
  const s = status.toLowerCase();
  if (s === 'landed' || s === 'departed') return 'landed';
  if (s === 'cancelled' || s === 'delayed') return 'delayed';
  if (s === 'check_in' || s === 'boarding' || s === 'gate_closed') return 'boarding';
  return 'ontime'; // termasuk 'scheduled' dan nilai tidak dikenal lainnya
}

// ---------------------------------------------------------------------
// Bentuk ringkas untuk UI -- menyembunyikan field internal yang tidak perlu
// ditampilkan (id, timestamp, dsb), dan menyamakan bentuk antara
// kedatangan & keberangkatan supaya gampang dipakai di satu komponen.
// ---------------------------------------------------------------------

export type JadwalRingkasAPT = {
  id: number | string;
  jam: string;
  kodePenerbangan: string;
  namaMaskapai: string;
  logoMaskapai: string;
  status: string;
  kota: string;
  iata: string;
  gate?: string;
  konter?: number;
  kategori?: KategoriStatus; // opsional -- kalau diisi adapter, dipakai langsung tanpa ditebak ulang di client
  sumberData?: 'resmi' | 'opensky'; // 'opensky' = data fallback, lihat lib/opensky.ts untuk keterbatasannya
};

export function ringkasKedatanganAPT(data: FlightAPT[]): JadwalRingkasAPT[] {
  return data.map((item) => ({
    id: item.id,
    jam: item.scheduled_time.replace(/\s*WITA$/i, ''),
    kodePenerbangan: item.flight_number,
    namaMaskapai: item.airline,
    logoMaskapai: item.airline_logo ?? '',
    status: item.remarks,
    kota: item.origin_city,
    iata: ekstrakIATA(item.origin),
    kategori: kategoriStatus(item.status),
    sumberData: 'resmi',
  }));
}

export function ringkasKeberangkatanAPT(data: FlightAPT[]): JadwalRingkasAPT[] {
  return data.map((item) => ({
    id: item.id,
    jam: item.scheduled_time.replace(/\s*WITA$/i, ''),
    kodePenerbangan: item.flight_number,
    namaMaskapai: item.airline,
    logoMaskapai: item.airline_logo ?? '',
    status: item.remarks,
    kota: item.destination_city,
    iata: ekstrakIATA(item.destination),
    gate: item.gate ?? undefined,
    konter: item.checkin_counters[0],
    kategori: kategoriStatus(item.status),
    sumberData: 'resmi',
  }));
}

/**
 * Filter jadwal (kedatangan atau keberangkatan, sudah dalam bentuk ringkas)
 * berdasarkan kata kunci kota/kode IATA -- ini yang jadi fitur "pencarian bandara lain"
 * di dalam konteks jadwal APT Pranoto (bukan live board independen bandara lain).
 */
export function cariBerdasarkanBandara(
  data: JadwalRingkasAPT[],
  keyword: string
): JadwalRingkasAPT[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return data;
  return data.filter(
    (item) => item.kota.toLowerCase().includes(q) || item.iata.toLowerCase().includes(q)
  );
}