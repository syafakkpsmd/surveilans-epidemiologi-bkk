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

import type { KodeWilker, SelStatus, WilkerMatriks } from './core';
import type { PetaModulWilker } from '@/lib/wilayah-kerja/modul';
import { kunciNama, type Wilayah } from '@/lib/wilayah-kerja';

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

// Wilker yang WAJIB melapor per modul = wilayah yang dicentang untuk modul itu di
// /dashboard/pengaturan-wilayah-kerja (tabel wilker_modul), diteruskan lewat parameter `peta`.

// ------------------------------------------------- Pencocokan nama wilker

/** Kunci pencocok satu wilayah: nama pendek/resmi/peta dan alias (tanpa spasi/tanda baca), ditambah kata terakhir nama pendek
 *  bila khas (>= 5 huruf dan tidak memuat/dimuat kunci wilayah lain; mis. "pranoto" untuk "APT Pranoto"). */
function kunciPencocok(w: Wilayah, semua: readonly Wilayah[]): string[] {
  const dasar = (x: Wilayah) => [x.namaPendek, x.nama, x.namaPeta, ...x.alias].map(kunciNama).filter((k) => k.length >= 3);
  const milik = dasar(w);
  const kata = w.namaPendek.trim().split(/\s+/);
  const ekstra = kata.length > 1 ? kunciNama(kata[kata.length - 1]) : '';
  if (ekstra.length >= 5) {
    const lain = semua.filter((x) => x.kode !== w.kode).flatMap(dasar);
    if (!lain.some((k) => k.includes(ekstra) || ekstra.includes(k))) milik.push(ekstra);
  }
  return [...new Set(milik)];
}

/**
 * Pemeta nama wilayah (teks bebas di kolom wilayah_kerja: "Samarinda", "Pelabuhan Laut Sangatta", "APT_Pranoto", ...)
 * menjadi kode wilayah kerja, berdasarkan daftar wilayah dari wilker_ref (bukan pola tertulis di kode).
 * Teks yang memuat nama beberapa wilayah dipetakan ke nama TERPANJANG. Tidak dikenal -> null.
 * SKDR: wilayah yang punya `unitSkdr` baru "Sudah" bila SEMUA unitnya muncul; selain itu cukup 1 baris.
 */
export function buatPemetaWilker(daftar: readonly Wilayah[]) {
  const kandidat = [...daftar]
    .filter((w) => w.jenis !== 'Kantor')
    .sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode))
    .map((w) => ({ w, kunci: kunciPencocok(w, daftar) }));

  function petakanKeKode(namaMentah: string | null | undefined): KodeWilker | null {
    if (!namaMentah) return null;
    const n = kunciNama(namaMentah);
    let terbaik: { kode: string; panjang: number } | null = null;
    for (const { w, kunci } of kandidat) {
      const panjang = Math.max(0, ...kunci.filter((k) => n.includes(k)).map((k) => k.length));
      if (panjang > 0 && (!terbaik || panjang > terbaik.panjang)) terbaik = { kode: w.kode, panjang };
    }
    return terbaik?.kode ?? null;
  }

  function kumpulkanKode(namaMentah: (string | null | undefined)[]): Set<KodeWilker> {
    const hasil = new Set<KodeWilker>();
    for (const n of namaMentah) {
      const k = petakanKeKode(n);
      if (k) hasil.add(k);
    }
    return hasil;
  }

  function kumpulkanKodeSkdr(namaMentah: (string | null | undefined)[]): Set<KodeWilker> {
    const teksPerKode = new Map<string, string[]>();
    for (const n of namaMentah) {
      const k = petakanKeKode(n);
      if (k) teksPerKode.set(k, [...(teksPerKode.get(k) ?? []), kunciNama(n ?? '')]);
    }
    const hasil = new Set<KodeWilker>();
    for (const [kode, teks] of teksPerKode) {
      const unit = (daftar.find((w) => w.kode === kode)?.unitSkdr ?? []).map(kunciNama).filter(Boolean);
      if (unit.every((u) => teks.some((t) => t.includes(u)))) hasil.add(kode);
    }
    return hasil;
  }

  return { petakanKeKode, kumpulkanKode, kumpulkanKodeSkdr };
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

export function buildMatriksMingguanLlo(
  src: SumberMingguan,
  daftar: WilkerMatriks[],
  peta: PetaModulWilker,
  namaBkk = 'BKK',
): BarisLaluLintas<KunciMingguan>[] {
  const baris: BarisLaluLintas<KunciMingguan>[] = daftar.map((w) => {
    const status = {} as Record<KunciMingguan, SelStatusLlo>;
    for (const m of MODUL_MINGGUAN) {
      if (MODUL_TINGKAT_BKK.includes(m.kunci)) {
        status[m.kunci] = 'na';
      } else {
        const k = m.kunci as Exclude<KunciMingguan, 'pie_nasional' | 'pie_global'>;
        status[m.kunci] = selWilker(src[k], peta[k].includes(w.kode), w.kode);
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
    nama: `${namaBkk} (tingkat BKK)`,
    jenis: 'BKK',
    status: statusBkk,
    kelengkapanPct: hitungPct(Object.values(statusBkk)),
  });
  return baris;
}

export function buildMatriksBulananLlo(
  src: SumberBulanan,
  daftar: WilkerMatriks[],
  peta: PetaModulWilker,
): BarisLaluLintas<KunciBulanan>[] {
  return daftar.map((w) => {
    const status = {} as Record<KunciBulanan, SelStatusLlo>;
    for (const m of MODUL_BULANAN) {
      const berlaku = peta[m.kunci].includes(w.kode);
      status[m.kunci] = selWilker(src[m.kunci], berlaku, w.kode);
    }
    return { kode: w.kode, nama: w.nama, jenis: w.jenis, status, kelengkapanPct: hitungPct(Object.values(status)) };
  });
}
