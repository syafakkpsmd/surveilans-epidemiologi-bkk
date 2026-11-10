/**
 * lib/pemantauan-laporan/periode.ts
 *
 * Murni (tanpa database/React): memetakan TANGGAL KEGIATAN ke periode pelaporan, dan membuat jadwal SIKLUS.
 *
 *  - MINGGUAN : minggu epidemiologi MMWR (sama dengan lib/ketepatan-laporan/waktu.ts)
 *  - BULANAN  : bulan kalender
 *  - SIKLUS   : tahun dibagi `targetPerTahun` siklus berurutan, tiap siklus selama `intervalHari`
 *               (hari kerja Senin-Jumat atau hari kalender), mulai dari tanggal `mulaiSiklus` setiap tahun.
 *               Contoh: 6 siklus x 40 hari kerja mulai 1 Januari.
 *
 * Tanggal kegiatan dipakai sebagai "tanggal saja" (disimpan 00:00 UTC); batas siklus diubah ke instan WITA saat membuat jadwal.
 */

import type { PeriodeJadwal } from '@/lib/ketepatan-laporan/types';
import { NAMA_BULAN_PENDEK, WITA_OFFSET_MS, awalMingguEpid } from '@/lib/ketepatan-laporan/waktu';
import type { KonfigKegiatan } from './katalog';

const HARI_MS = 86_400_000;

export interface PeriodeTanggal {
  tahun: number;
  periode: number;
}

/** Tanggal kalender -> { tahun epid, minggu epid } (minggu ke-53 ikut dikembalikan; pemanggil yang membuang). */
export function mingguEpidDariTanggal(tahun: number, bulan: number, hari: number): PeriodeTanggal {
  const t = Date.UTC(tahun, bulan - 1, hari);
  for (const kandidat of [tahun + 1, tahun, tahun - 1]) {
    const awal = awalMingguEpid(kandidat, 1).getTime();
    if (t >= awal) return { tahun: kandidat, periode: Math.floor((t - awal) / (7 * HARI_MS)) + 1 };
  }
  return { tahun: tahun - 1, periode: 1 };
}

// ------------------------------------------------------------------ Siklus

/** Geser `n` hari kerja (Senin-Jumat) ke depan dari tanggal `t` (tanggal saja, UTC). n = 0 -> hari kerja pertama pada/ setelah t. */
function tambahHariKerja(t: number, n: number): number {
  let d = t;
  const hariKerja = (x: number) => {
    const w = new Date(x).getUTCDay();
    return w !== 0 && w !== 6;
  };
  while (!hariKerja(d)) d += HARI_MS;
  let sisa = n;
  while (sisa > 0) {
    d += HARI_MS;
    if (hariKerja(d)) sisa--;
  }
  return d;
}

export interface SiklusTanggal {
  nomor: number;
  /** Tanggal pertama siklus (tanggal saja, UTC, termasuk). */
  mulai: number;
  /** Tanggal pertama siklus BERIKUTNYA (tanggal saja, UTC, tidak termasuk). */
  akhirEksklusif: number;
}

/** Siklus-siklus satu tahun menurut konfigurasi. Kosong bila konfigurasi tidak lengkap. */
export function hitungSiklusTahun(tahun: number, k: Pick<KonfigKegiatan, 'targetPerTahun' | 'intervalHari' | 'hariKerja' | 'mulaiSiklus'>): SiklusTanggal[] {
  const target = k.targetPerTahun ?? 0;
  const interval = k.intervalHari ?? 0;
  if (target < 1 || interval < 1) return [];
  const [bln, tgl] = k.mulaiSiklus.split('-').map(Number);
  const awal = Date.UTC(tahun, (bln || 1) - 1, tgl || 1);
  const maju = (n: number) => (k.hariKerja ? tambahHariKerja(awal, n * interval) : awal + n * interval * HARI_MS);
  return Array.from({ length: target }, (_, i) => ({ nomor: i + 1, mulai: maju(i), akhirEksklusif: maju(i + 1) }));
}

function fmt(t: number, denganTahun: boolean): string {
  const d = new Date(t);
  const s = `${d.getUTCDate()} ${NAMA_BULAN_PENDEK[d.getUTCMonth()]}`;
  return denganTahun ? `${s} ${d.getUTCFullYear()}` : s;
}

/** Jadwal siklus dalam bentuk PeriodeJadwal (dipakai evaluasi & matriks yang sama dengan mingguan/bulanan). */
export function buatJadwalSiklus(tahun: number, k: KonfigKegiatan): PeriodeJadwal[] {
  return hitungSiklusTahun(tahun, k).map((s) => {
    const akhirInstan = s.akhirEksklusif - WITA_OFFSET_MS; // 00:00 WITA hari pertama siklus berikutnya
    const hariTerakhir = s.akhirEksklusif - HARI_MS;
    return {
      periode: s.nomor,
      labelPendek: `S${s.nomor}`,
      labelPanjang: `Siklus ${s.nomor} (${fmt(s.mulai, false)}-${fmt(hariTerakhir, true)})`,
      akhirPeriode: new Date(akhirInstan),
      deadline: new Date(akhirInstan + k.tenggangHari * HARI_MS - 1),
    };
  });
}

/** Siklus yang memuat tanggal itu (tahun konfigurasi = tahun tanggal atau tahun sebelumnya), atau null. */
export function siklusDariTanggal(tahun: number, bulan: number, hari: number, k: KonfigKegiatan): PeriodeTanggal | null {
  const t = Date.UTC(tahun, bulan - 1, hari);
  for (const th of [tahun, tahun - 1]) {
    const s = hitungSiklusTahun(th, k).find((x) => t >= x.mulai && t < x.akhirEksklusif);
    if (s) return { tahun: th, periode: s.nomor };
  }
  return null;
}
