// components/vektor/dbd/tipe.ts
import type { Zona } from '@/lib/vektor/dbd/config';

export type BarisDbd = {
  id: number;
  tgl_survei: string;
  kode_wilker: string;
  zona: Zona;
  sub_lokasi: string | null;
  jml_rumah_diperiksa: number | null;
  jml_positif_jentik: number | null;
  container_diperiksa: number | null;
  container_positif: number | null;
  abj: number | null;
  hi: number | null;
  ci: number | null;
  bi: number | null;
  curah_hujan_mm: number | null;
  tindakan_pengendalian: string | null;
  larvasida_gram: number | null;
  luas_wilayah_fogging_ha: number | null;
  jml_insektisida_fogging_ml: number | null; // berisi liter (lihat LITER_KE_DB)
  ada_pengendalian: boolean;
};