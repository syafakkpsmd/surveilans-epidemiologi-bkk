// components/vektor/tikus/tipe.ts
import type { HasilLab, KodeSpesies } from '@/lib/vektor/tikus/config';

export type BarisSurvei = {
  id: number;
  tgl_survei: string;
  kode_wilker: string;
  jml_trap_dipasang: number | null;
  rt: number | null;
  rn: number | null;
  mm: number | null;
  jenis_lainnya: number | null;
  jml_trap_tertangkap: number | null;
  tsi: number | null;
  jml_pinjal_ditemukan: number | null;
  index_pinjal: number | null;
  keterangan: string | null;
  lab_lama: boolean; // baris lama yang masih menyimpan catatan lab
};

export type BarisLab = {
  id: number;
  tgl_periksa: string;
  kode_wilker: string;
  nama_tikus: KodeSpesies;
  lokasi_pemasangan: string;
  kode_sampel: string | null;
  hasil_leptospira: HasilLab | null;
  hasil_pes: HasilLab | null;
  hasil_hantavirus: HasilLab | null;
  keterangan: string | null;
};