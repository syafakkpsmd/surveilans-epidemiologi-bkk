// lib/bandara-live/sepinggan.ts
// Integrasi endpoint publik situs resmi Sepinggan (sepinggan-airport.com)
// Ditemukan via DevTools Network tab. Sama seperti aptpairport.id, ini
// endpoint tidak resmi/tidak didokumentasikan publik, jadi bisa berubah
// sewaktu-waktu tanpa pemberitahuan. Selalu bungkus try-catch.

import type { JadwalRingkasAPT, KategoriStatus } from '@/lib/aptpranoto';

const BASE = 'https://sepinggan-airport.com/data-airline';

type BarisSepinggan = {
  actual: string;
  airportcode: string;
  airportloc: string;
  arrdep: 'A' | 'D';
  beltnumber: string;
  desknumber: string;
  domint: 'D' | 'I';
  estimate: string;
  flightno: string;
  flightstat: string;
  fromto: string;
  fromtolocation: string;
  gatenumber: string;
  operator: string;
  schedule: string;
  terminal: string;
  transit: string;
};

type ResponseSepinggan = {
  response: string;
  data: BarisSepinggan[];
};

async function fetchSepinggan(arrdep: 'arr' | 'dept', domint: 'domestic' | 'international'): Promise<BarisSepinggan[]> {
  const res = await fetch(`${BASE}/${arrdep}/${domint}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Sepinggan API error (${arrdep}/${domint}): ${res.status} ${res.statusText}`);
  }

  const json: ResponseSepinggan = await res.json();
  return json.data ?? [];
}

// ---------------------------------------------------------------------
// Mapping kode operator -> nama maskapai (API ini tidak menyediakan
// nama lengkap/logo, cuma kode 2 huruf). Tambah di sini kalau ada
// maskapai baru yang belum kepetakan -- fallback-nya pakai kode aslinya.
// ---------------------------------------------------------------------
const NAMA_MASKAPAI: Record<string, string> = {
  GA: 'Garuda Indonesia',
  JT: 'Lion Air',
  ID: 'Batik Air',
  IW: 'Wings Air',
  QG: 'Citilink',
  IU: 'Super Air Jet',
  SJ: 'Sriwijaya Air',
  IP: 'Pelita Air',
};

function namaMaskapai(kode: string): string {
  return NAMA_MASKAPAI[kode] ?? kode;
}

// Sepinggan tidak menyediakan logo -- pakai placeholder berisi kode maskapai
function logoPlaceholder(kode: string): string {
  return `https://placehold.co/100x100/png?text=${encodeURIComponent(kode || '?')}`;
}

// ---------------------------------------------------------------------
// Kategori status -- kosakata Sepinggan beda dari Pranoto, jadi
// pemetaan dilakukan di sini (server-side), bukan ditebak di client.
// ---------------------------------------------------------------------
function kategoriStatusSepinggan(status: string): KategoriStatus {
  const s = status.toLowerCase();
  if (s.includes('not operating') || s.includes('cancel')) return 'delayed';
  if (s.includes('landed') || s.includes('departed')) return 'landed';
  if (s.includes('check in') || s.includes('boarding') || s.includes('gate close')) return 'boarding';
  return 'ontime'; // Scheduled, Estimate, Perkiraan, dll
}

// Hash sederhana buat bikin id numerik stabil dari flightno + jadwal
// (API-nya tidak menyediakan field id)
function buatId(flightno: string, schedule: string): number {
  const str = `${flightno}-${schedule}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jamTampil(baris: BarisSepinggan): string {
  const raw = baris.actual || baris.estimate || baris.schedule;
  if (!raw) return '-';
  const bagianJam = raw.split(' ')[1]; // "HH:mm:ss"
  return bagianJam ? bagianJam.slice(0, 5) : raw; // "HH:mm"
}

function ringkas(baris: BarisSepinggan[]): JadwalRingkasAPT[] {
  return baris
    // "Not Operating" = rute tidak jalan hari ini (biasanya duplikat entry
    // aktifnya) -- disembunyikan supaya tidak bikin daftar dobel/membingungkan
    .filter((item) => !item.flightstat.toLowerCase().includes('not operating'))
    .map((item) => ({
      id: buatId(item.flightno, item.schedule),
      jam: jamTampil(item),
      kodePenerbangan: item.flightno,
      namaMaskapai: namaMaskapai(item.operator),
      logoMaskapai: logoPlaceholder(item.operator),
      status: item.flightstat,
      kota: item.fromtolocation,
      iata: item.fromto,
      gate: item.gatenumber || item.desknumber || undefined,
      kategori: kategoriStatusSepinggan(item.flightstat),
    }))
    .sort((a, b) => a.jam.localeCompare(b.jam));
}

export async function ambilDataSepinggan(): Promise<{
  kedatangan: JadwalRingkasAPT[];
  keberangkatan: JadwalRingkasAPT[];
}> {
  const [arrDom, arrIntl, deptDom, deptIntl] = await Promise.all([
    fetchSepinggan('arr', 'domestic').catch((err) => {
      console.error('Sepinggan arr/domestic bermasalah:', err);
      return [];
    }),
    fetchSepinggan('arr', 'international').catch((err) => {
      console.error('Sepinggan arr/international bermasalah:', err);
      return [];
    }),
    fetchSepinggan('dept', 'domestic').catch((err) => {
      console.error('Sepinggan dept/domestic bermasalah:', err);
      return [];
    }),
    fetchSepinggan('dept', 'international').catch((err) => {
      console.error('Sepinggan dept/international bermasalah:', err);
      return [];
    }),
  ]);

  return {
    kedatangan: ringkas([...arrDom, ...arrIntl]),
    keberangkatan: ringkas([...deptDom, ...deptIntl]),
  };
}