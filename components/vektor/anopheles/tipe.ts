// components/vektor/anopheles/tipe.ts
import type { Zona } from '@/lib/vektor/anopheles/config';

export type BarisAnopheles = {
  id: number;
  tgl_survei: string;
  kode_wilker: string;
  zona: Zona;
  sub_lokasi: string | null;
  fase_bulan: string | null;
  suhu_c: number | null;
  kelembapan_pct: number | null;
  cuaca: string | null;
  metode_tangkap: string | null;
  jml_nyamuk: number | null;
  jml_petugas: number | null;
  jml_jam_tangkap: number | null;
  mbr: number | null;
  mhd: number | null;
  spesies: string | null;
  jumlah_cidukan: number | null;
  jumlah_larva: number | null;
  jumlah_jenis_larva: number | null;
  spesies_larva: string | null;
  macam_tempat_perindukan: string | null;
  keadaan_tempat_perindukan: string | null;
};

export type Opsi = {
  metode: string[]; spesies: string[]; spesiesLarva: string[]; macam: string[]; keadaan: string[]; cuaca: string[];
};
export const OPSI_AWAL: Opsi = { metode: [], spesies: [], spesiesLarva: [], macam: [], keadaan: [], cuaca: [] };