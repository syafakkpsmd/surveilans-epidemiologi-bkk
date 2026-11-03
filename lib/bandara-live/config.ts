import type { JadwalRingkasAPT } from '@/lib/aptpranoto';
import { ambilDataPranoto } from './pranoto';
import { ambilDataSepinggan } from './sepinggan';
import { DAFTAR_BANDARA, getMetaBandara } from './daftar';

type HasilPengambilData = {
  kedatangan: JadwalRingkasAPT[];
  keberangkatan: JadwalRingkasAPT[];
  sumberData?: 'resmi' | 'opensky' | 'campuran' | 'tidak_tersedia'; // opsional -- adapter lama (sepinggan) belum mengisi ini
};

type PengambilData = () => Promise<HasilPengambilData>;

const PENGAMBIL_DATA: Record<string, PengambilData> = {
  pranoto: ambilDataPranoto,
  sepinggan: ambilDataSepinggan,
};

export { DAFTAR_BANDARA, getMetaBandara };

export function getPengambilData(kode: string): PengambilData | undefined {
  return PENGAMBIL_DATA[kode];
}