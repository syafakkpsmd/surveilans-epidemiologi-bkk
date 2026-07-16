import type { JadwalRingkasAPT } from '@/lib/aptpranoto';
import { ambilDataPranoto } from './pranoto';
import { ambilDataSepinggan } from './sepinggan';
import { DAFTAR_BANDARA, getMetaBandara } from './daftar';

type PengambilData = () => Promise<{
  kedatangan: JadwalRingkasAPT[];
  keberangkatan: JadwalRingkasAPT[];
}>;

const PENGAMBIL_DATA: Record<string, PengambilData> = {
  pranoto: ambilDataPranoto,
  sepinggan: ambilDataSepinggan,
};

export { DAFTAR_BANDARA, getMetaBandara };

export function getPengambilData(kode: string): PengambilData | undefined {
  return PENGAMBIL_DATA[kode];
}