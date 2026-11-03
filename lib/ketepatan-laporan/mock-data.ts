/**
 * lib/ketepatan-laporan/mock-data.ts
 *
 * DATA CONTOH deterministik (PRNG berbenih, jadi hasilnya sama di server dan
 * klien -- tidak ada hydration mismatch). Ganti pemanggilan buatMockLaporan()
 * di page.tsx dengan query data asli yang menghasilkan `UnitFaskes[]` dan
 * `LaporanMasuk[]` (satu baris per laporan yang masuk, dengan waktu kirimnya).
 */

import type { JenisLaporan, LaporanMasuk, UnitFaskes } from './types';
import { buatJadwal } from './evaluasi';
import { keIsoWita } from './waktu';

export const UNIT_CONTOH: UnitFaskes[] = [
  { id: 'pel-samarinda', nama: 'Pelabuhan Samarinda', wilayah: 'Samarinda', jenis: 'Pelabuhan' },
  { id: 'pel-tanjung-santan', nama: 'Pelabuhan Tanjung Santan', wilayah: 'Tanjung Santan', jenis: 'Pelabuhan' },
  { id: 'pel-tanjung-laut', nama: 'Pelabuhan Tanjung Laut', wilayah: 'Tanjung Laut', jenis: 'Pelabuhan' },
  { id: 'pel-lhoktuan', nama: 'Pelabuhan Lhoktuan', wilayah: 'Lhoktuan', jenis: 'Pelabuhan' },
  { id: 'pel-sangatta', nama: 'Pelabuhan Sangatta', wilayah: 'Sangatta', jenis: 'Pelabuhan' },
  { id: 'pel-sangkulirang', nama: 'Pelabuhan Sangkulirang', wilayah: 'Sangkulirang', jenis: 'Pelabuhan' },
  { id: 'bdr-apt-pranoto', nama: 'Bandara APT Pranoto', wilayah: 'APT Pranoto', jenis: 'Bandara' },
  { id: 'pkm-palaran', nama: 'Puskesmas Palaran', wilayah: 'Samarinda', jenis: 'Puskesmas' },
  { id: 'pkm-sidomulyo', nama: 'Puskesmas Sidomulyo', wilayah: 'Samarinda', jenis: 'Puskesmas' },
  { id: 'klinik-contoh-a', nama: 'Klinik Binaan Contoh A', wilayah: 'Samarinda', jenis: 'Klinik Binaan' },
  { id: 'klinik-contoh-b', nama: 'Klinik Binaan Contoh B', wilayah: 'Sangatta', jenis: 'Klinik Binaan' },
];

/** Peluang tepat waktu / terlambat per unit (sisanya tidak melapor). */
const PROFIL: Record<string, { tepat: number; lambat: number }> = {
  'pel-samarinda': { tepat: 0.93, lambat: 0.06 },
  'pel-tanjung-santan': { tepat: 0.85, lambat: 0.1 },
  'pel-tanjung-laut': { tepat: 0.9, lambat: 0.08 },
  'pel-lhoktuan': { tepat: 0.7, lambat: 0.18 },
  'pel-sangatta': { tepat: 0.88, lambat: 0.1 },
  'pel-sangkulirang': { tepat: 0.55, lambat: 0.25 },
  'bdr-apt-pranoto': { tepat: 0.96, lambat: 0.03 },
  'pkm-palaran': { tepat: 0.8, lambat: 0.15 },
  'pkm-sidomulyo': { tepat: 0.92, lambat: 0.06 },
  'klinik-contoh-a': { tepat: 0.75, lambat: 0.15 },
  'klinik-contoh-b': { tepat: 0.97, lambat: 0.02 },
};

/** Laporan bulanan dibuat sedikit lebih seret supaya kartu tampil beragam. */
const FAKTOR_BULANAN = { tepat: 0.97, lambat: 0.6 };

const HARI_MS = 86_400_000;
const LAMBAT_MAKS_MS: Record<JenisLaporan, number> = { MINGGUAN: 5 * HARI_MS, BULANAN: 12 * HARI_MS };

function hashSeed(teks: string): number {
  let h = 2166136261;
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 */
function acak(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Menghasilkan laporan contoh untuk `tahunList`. Laporan hanya dibuat bila
 * waktu kirimnya <= now (tidak ada laporan "dari masa depan").
 */
export function buatMockLaporan(
  now: Date,
  tahunList: readonly number[],
): { units: UnitFaskes[]; laporan: LaporanMasuk[] } {
  const laporan: LaporanMasuk[] = [];

  for (const tahun of tahunList) {
    for (const jenis of ['MINGGUAN', 'BULANAN'] as const) {
      const jadwal = buatJadwal(jenis, tahun);
      for (const unit of UNIT_CONTOH) {
        const dasar = PROFIL[unit.id];
        const tepat = jenis === 'BULANAN' ? dasar.tepat * FAKTOR_BULANAN.tepat : dasar.tepat;
        const lambat = jenis === 'BULANAN' ? dasar.lambat * FAKTOR_BULANAN.lambat : dasar.lambat;

        for (const p of jadwal) {
          if (p.akhirPeriode.getTime() >= now.getTime()) continue; // periode belum selesai
          const rnd = acak(hashSeed(`${unit.id}|${jenis}|${tahun}|${p.periode}`));
          const r = rnd();
          let kirim: number;
          if (r < tepat) {
            const a = p.akhirPeriode.getTime();
            kirim = a + rnd() * (p.deadline.getTime() - a);
          } else if (r < tepat + lambat) {
            kirim = p.deadline.getTime() + 60_000 + rnd() * LAMBAT_MAKS_MS[jenis];
          } else {
            continue; // tidak melapor
          }
          if (kirim > now.getTime()) continue;
          laporan.push({
            unitId: unit.id,
            jenis,
            tahun,
            periode: p.periode,
            submittedAt: keIsoWita(new Date(Math.floor(kirim / 1000) * 1000)),
          });
        }
      }
    }
  }
  return { units: UNIT_CONTOH, laporan };
}
