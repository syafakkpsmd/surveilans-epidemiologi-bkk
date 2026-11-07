// lib/input-data/modul-server.ts  (FILE BARU)
// SERVER-ONLY. Menempelkan daftar wilayah kerja yang dicentang admin (tabel wilker_modul) ke definisi modul.
// Modul tanpa `kunciWilker` (COP, PHQC, sertifikat, dst.) dikembalikan apa adanya.
import 'server-only';
import type { ModulInput } from './modul';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';

export async function modulEfektif(modul: ModulInput): Promise<ModulInput> {
  if (!modul.kunciWilker) return modul;
  const boleh = await getWilkerModul(modul.kunciWilker); // sudah hanya wilayah AKTIF yang dicentang untuk modul ini
  return { ...modul, kodeWilkerBoleh: boleh.map((w) => w.kode) };
}
