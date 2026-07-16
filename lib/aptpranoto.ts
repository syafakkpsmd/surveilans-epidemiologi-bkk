// src/lib/aptpranoto.ts
// Integrasi endpoint publik resmi APT Pranoto Airport (aptpairport.id)
// Ditemukan via DevTools Network tab -- endpoint yang dipakai situs resminya sendiri.
// CATATAN: ini endpoint tidak resmi/tidak didokumentasikan publik oleh pihak bandara,
// jadi bisa berubah sewaktu-waktu tanpa pemberitahuan. Selalu bungkus dengan try-catch
// dan siapkan fallback (misal ke data manual/Supabase) kalau endpoint ini gagal/berubah.
//
// PENTING: endpoint ini hanya berisi jadwal APT Pranoto (Samarinda).
// bandara_asal/bandara_tujuan adalah kota rute, BUKAN live board independen bandara lain.

const APT_PRANOTO_BASE = 'https://aptpairport.id/api';
const LOGO_BASE_URL = 'https://aptpairport.id/api/image-proxy';

type MaskapaiAPT = {
  id: number;
  nama: string;
  logo: string;
  kode_warna: string;
};

type PesawatAPT = {
  id: number;
  kode_penerbangan: string;
  jenis: string;
  tipe: string;
};

type RemarkAPT = {
  id: number;
  status: string; // "Arrived On-Time" | "Estimate" | "Check In Open" | "Scheduled" | dll
  jenis: string;
  is_aktif: string;
};

type BandaraAPT = {
  id: number;
  nama: string;
  iata: string;
  kota_provinsi: string;
};

type GateAPT = {
  id: number;
  nama: string; // mis. "A1", "B1"
  urutan: number;
};

export type JadwalKedatanganAPT = {
  id: number;
  tanggal: string;
  jam: string;
  conveyor: number;
  maskapai: MaskapaiAPT;
  pesawat: PesawatAPT;
  remark: RemarkAPT;
  bandara_asal: BandaraAPT;
};

export type JadwalKeberangkatanAPT = {
  id: number;
  tanggal: string;
  jam: string;
  konter: number;
  konter2: number;
  konter3: number;
  gate: GateAPT;
  maskapai: MaskapaiAPT;
  pesawat: PesawatAPT;
  remark: RemarkAPT;
  bandara_tujuan: BandaraAPT;
};

type ResponseAPT<T> = {
  success: boolean;
  data: T[];
};

async function fetchAPT<T>(endpoint: string): Promise<T[]> {
  const res = await fetch(`${APT_PRANOTO_BASE}/${endpoint}`, {
    next: { revalidate: 60 }, // cache 60 detik -- data ini update per menit di sumbernya
  });

  if (!res.ok) {
    throw new Error(`APT Pranoto API error (${endpoint}): ${res.status} ${res.statusText}`);
  }

  const json: ResponseAPT<T> = await res.json();

  if (!json.success) {
    throw new Error(`APT Pranoto API mengembalikan success: false (${endpoint})`);
  }

  return json.data;
}

export async function getKedatanganAPT(): Promise<JadwalKedatanganAPT[]> {
  return fetchAPT<JadwalKedatanganAPT>('arrivals');
}

export async function getKeberangkatanAPT(): Promise<JadwalKeberangkatanAPT[]> {
  return fetchAPT<JadwalKeberangkatanAPT>('departures');
}

// ---------------------------------------------------------------------
// Helper logo & status
// ---------------------------------------------------------------------

export function urlLogoMaskapai(namaFileLogo: string): string {
  if (!namaFileLogo) return '';
  return `${LOGO_BASE_URL}/${namaFileLogo}`;
}

export type KategoriStatus = 'landed' | 'delayed' | 'boarding' | 'ontime';

export function kategoriStatus(status: string): KategoriStatus {
  const s = status.toLowerCase();
  if (s.includes('delay')) return 'delayed';
  if (s.includes('boarding') || s.includes('check in')) return 'boarding';
  if (s.includes('landed') || s.includes('departured') || s.includes('arrived')) return 'landed';
  return 'ontime';
}

// ---------------------------------------------------------------------
// Bentuk ringkas untuk UI -- menyembunyikan field internal yang tidak perlu
// ditampilkan (id, timestamp, dsb), dan menyamakan bentuk antara
// kedatangan & keberangkatan supaya gampang dipakai di satu komponen.
// ---------------------------------------------------------------------

export type JadwalRingkasAPT = {
  id: number;
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
};

export function ringkasKedatanganAPT(data: JadwalKedatanganAPT[]): JadwalRingkasAPT[] {
  return data.map((item) => ({
    id: item.id,
    jam: item.jam,
    kodePenerbangan: item.pesawat.kode_penerbangan,
    namaMaskapai: item.maskapai.nama,
    logoMaskapai: urlLogoMaskapai(item.maskapai.logo),
    status: item.remark.status,
    kota: item.bandara_asal.kota_provinsi,
    iata: item.bandara_asal.iata,
  }));
}

export function ringkasKeberangkatanAPT(data: JadwalKeberangkatanAPT[]): JadwalRingkasAPT[] {
  return data.map((item) => ({
    id: item.id,
    jam: item.jam,
    kodePenerbangan: item.pesawat.kode_penerbangan,
    namaMaskapai: item.maskapai.nama,
    logoMaskapai: urlLogoMaskapai(item.maskapai.logo),
    status: item.remark.status,
    kota: item.bandara_tujuan.kota_provinsi,
    iata: item.bandara_tujuan.iata,
    gate: item.gate?.nama,
    konter: item.konter,
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