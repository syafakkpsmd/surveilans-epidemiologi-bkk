/**
 * lib/status-laporan/lalu-lintas-orang.ts
 *
 * Logic murni (tanpa akses database) untuk menu Status Laporan
 * "Lalu Lintas Orang": matriks MINGGUAN dan BULANAN per wilayah kerja.
 *
 * Definisi "Sudah": ada MINIMAL 1 baris data untuk wilker tsb pada periode
 * itu (BUKAN jumlah > 0). Untuk SKDR ini penting: 0 kasus tetap laporan.
 * Sel yang bukan kewajiban wilker = 'na' (tampil "—", tidak dihitung Belum).
 */

import { DAFTAR_WILKER } from './core';
import type { KodeWilker, SelStatus } from './core';

/** 'gagal' = sumber data tidak bisa dibaca (BUKAN berarti belum lapor). */
export type SelStatusLlo = SelStatus | 'gagal';

// ---------------------------------------------------------------- Kolom

export const MODUL_MINGGUAN = [
  { kunci: 'poliklinik', label: 'Kunjungan Poliklinik' },
  { kunci: 'penumpang_kapal', label: 'Penumpang Kapal' },
  { kunci: 'siaos', label: 'SIAOS' },
  { kunci: 'kier', label: 'KIER Kesehatan' },
  { kunci: 'pie_nasional', label: 'PIE Nasional' },
  { kunci: 'pie_global', label: 'PIE Global' },
  { kunci: 'skdr', label: 'SKDR' },
] as const;
export type KunciMingguan = (typeof MODUL_MINGGUAN)[number]['kunci'];

export const MODUL_BULANAN = [
  { kunci: 'tb', label: 'Surveilans TB' },
  { kunci: 'hiv', label: 'Surveilans HIV' },
  { kunci: 'malaria', label: 'Migrasi Malaria' },
] as const;
export type KunciBulanan = (typeof MODUL_BULANAN)[number]['kunci'];

// ------------------------------------------------------------ Kewajiban

/** Modul yang dilaporkan di tingkat BKK (nasional/global), bukan per wilker. */
const MODUL_TINGKAT_BKK: readonly KunciMingguan[] = ['pie_nasional', 'pie_global'];

/**
 * Wilker yang WAJIB melapor per modul mingguan. Mengikuti daftar sheet/lokasi
 * yang dipakai tiap modul di aplikasi (poliklinik & KIER: 5 wilker; SIAOS: 3;
 * Penumpang Kapal: Samarinda + Lhoktuan; SKDR: semua). Ubah di sini kalau
 * kewajibannya berubah.
 */
const BERLAKU_MINGGUAN: Record<Exclude<KunciMingguan, 'pie_nasional' | 'pie_global'>, readonly KodeWilker[]> = {
  poliklinik: ['WK01', 'WK03', 'WK04', 'WK05', 'WK07'],
  kier: ['WK01', 'WK03', 'WK04', 'WK05', 'WK07'],
  siaos: ['WK01', 'WK04', 'WK07'],
  penumpang_kapal: ['WK01', 'WK04'],
  skdr: ['WK01', 'WK02', 'WK03', 'WK04', 'WK05', 'WK06', 'WK07'],
};

/** Wilker yang TIDAK wajib per modul bulanan (default: semua wajib). */
const TIDAK_BERLAKU_BULANAN: Partial<Record<KunciBulanan, readonly KodeWilker[]>> = {};

// ------------------------------------------------- Pencocokan nama wilker

const POLA_WILKER: { kode: KodeWilker; pola: RegExp }[] = [
  { kode: 'WK07', pola: /pranoto/ },
  { kode: 'WK02', pola: /tanjung\s*santan/ },
  { kode: 'WK03', pola: /tanjung\s*laut/ },
  { kode: 'WK04', pola: /lhok\s*tuan/ },
  { kode: 'WK05', pola: /sangatta/ },
  { kode: 'WK06', pola: /sangkulirang/ },
  { kode: 'WK01', pola: /samarinda/ },
];

const normalisasi = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Kolom wilayah_kerja berisi teks bebas ("Samarinda", "Pelabuhan Samarinda",
 * "APT_Pranoto", ...), jadi dicocokkan lewat kata kunci, bukan sama-persis. */
export function petakanKeKode(namaMentah: string | null | undefined): KodeWilker | null {
  if (!namaMentah) return null;
  const n = normalisasi(namaMentah);
  for (const { kode, pola } of POLA_WILKER) if (pola.test(n)) return kode;
  return null;
}

export function kumpulkanKode(namaMentah: (string | null | undefined)[]): Set<KodeWilker> {
  const hasil = new Set<KodeWilker>();
  for (const n of namaMentah) {
    const k = petakanKeKode(n);
    if (k) hasil.add(k);
  }
  return hasil;
}

/**
 * SKDR: Samarinda dipecah jadi 2 puskesmas (Palaran & Sidomulyo). WK01
 * dianggap Sudah hanya kalau KEDUANYA sudah masuk; wilker lain cukup 1 baris.
 */
export function kumpulkanKodeSkdr(namaMentah: (string | null | undefined)[]): Set<KodeWilker> {
  const hasil = kumpulkanKode(namaMentah.filter((n) => !/samarinda/.test(normalisasi(n ?? ''))));
  const samarinda = namaMentah.map((n) => normalisasi(n ?? '')).filter((n) => /samarinda/.test(n));
  const adaPalaran = samarinda.some((n) => /palaran/.test(n));
  const adaSidomulyo = samarinda.some((n) => /sidomulyo/.test(n));
  if (adaPalaran && adaSidomulyo) hasil.add('WK01');
  return hasil;
}

// ----------------------------------------------------------- Tipe sumber

export type SumberWilker = { ok: true; kode: Set<KodeWilker> } | { ok: false };
export type SumberBkk = { ok: true; ada: boolean } | { ok: false };

export type SumberMingguan = {
  poliklinik: SumberWilker;
  penumpang_kapal: SumberWilker;
  siaos: SumberWilker;
  kier: SumberWilker;
  skdr: SumberWilker;
  pie_nasional: SumberBkk;
  pie_global: SumberBkk;
};
export type SumberBulanan = Record<KunciBulanan, SumberWilker>;

// --------------------------------------------------------------- Matriks

export type BarisLaluLintas<K extends string> = {
  kode: string;
  nama: string;
  jenis: 'Pelabuhan' | 'Bandara' | 'BKK';
  status: Record<K, SelStatusLlo>;
  kelengkapanPct: number | null;
};

function hitungPct(nilai: SelStatusLlo[]): number | null {
  const dihitung = nilai.filter((s) => s === 'sudah' || s === 'belum');
  if (dihitung.length === 0) return null;
  return Math.round((dihitung.filter((s) => s === 'sudah').length / dihitung.length) * 100);
}

function selWilker(sumber: SumberWilker, berlaku: boolean, kode: KodeWilker): SelStatusLlo {
  if (!berlaku) return 'na';
  if (!sumber.ok) return 'gagal';
  return sumber.kode.has(kode) ? 'sudah' : 'belum';
}

export function buildMatriksMingguanLlo(src: SumberMingguan): BarisLaluLintas<KunciMingguan>[] {
  const baris: BarisLaluLintas<KunciMingguan>[] = DAFTAR_WILKER.map((w) => {
    const status = {} as Record<KunciMingguan, SelStatusLlo>;
    for (const m of MODUL_MINGGUAN) {
      if (MODUL_TINGKAT_BKK.includes(m.kunci)) {
        status[m.kunci] = 'na';
      } else {
        const k = m.kunci as keyof typeof BERLAKU_MINGGUAN;
        status[m.kunci] = selWilker(src[k], BERLAKU_MINGGUAN[k].includes(w.kode), w.kode);
      }
    }
    return { kode: w.kode, nama: w.nama, jenis: w.jenis, status, kelengkapanPct: hitungPct(Object.values(status)) };
  });

  // Baris tambahan: modul tingkat BKK (PIE Nasional & Global)
  const statusBkk = {} as Record<KunciMingguan, SelStatusLlo>;
  for (const m of MODUL_MINGGUAN) {
    if (MODUL_TINGKAT_BKK.includes(m.kunci)) {
      const s = src[m.kunci as 'pie_nasional' | 'pie_global'];
      statusBkk[m.kunci] = !s.ok ? 'gagal' : s.ada ? 'sudah' : 'belum';
    } else {
      statusBkk[m.kunci] = 'na';
    }
  }
  baris.push({
    kode: 'BKK',
    nama: 'BKK Kelas I Samarinda (tingkat BKK)',
    jenis: 'BKK',
    status: statusBkk,
    kelengkapanPct: hitungPct(Object.values(statusBkk)),
  });
  return baris;
}

export function buildMatriksBulananLlo(src: SumberBulanan): BarisLaluLintas<KunciBulanan>[] {
  return DAFTAR_WILKER.map((w) => {
    const status = {} as Record<KunciBulanan, SelStatusLlo>;
    for (const m of MODUL_BULANAN) {
      const berlaku = !(TIDAK_BERLAKU_BULANAN[m.kunci] ?? []).includes(w.kode);
      status[m.kunci] = selWilker(src[m.kunci], berlaku, w.kode);
    }
    return { kode: w.kode, nama: w.nama, jenis: w.jenis, status, kelengkapanPct: hitungPct(Object.values(status)) };
  });
}
