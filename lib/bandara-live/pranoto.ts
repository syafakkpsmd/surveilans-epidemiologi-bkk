// lib/bandara-live/pranoto.ts
import {
  getKedatanganAPT,
  getKeberangkatanAPT,
  ringkasKedatanganAPT,
  ringkasKeberangkatanAPT,
  type JadwalRingkasAPT,
} from '@/lib/aptpranoto';

export async function ambilDataPranoto(): Promise<{
  kedatangan: JadwalRingkasAPT[];
  keberangkatan: JadwalRingkasAPT[];
}> {
  const [kedatanganRaw, keberangkatanRaw] = await Promise.all([
    getKedatanganAPT().catch((err) => {
      console.error('API Kedatangan APT Pranoto bermasalah:', err);
      return null;
    }),
    getKeberangkatanAPT().catch((err) => {
      console.error('API Keberangkatan APT Pranoto bermasalah:', err);
      return null;
    }),
  ]);

  return {
    kedatangan: kedatanganRaw ? ringkasKedatanganAPT(kedatanganRaw) : [],
    keberangkatan: keberangkatanRaw ? ringkasKeberangkatanAPT(keberangkatanRaw) : [],
  };
}