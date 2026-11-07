// Tipe domain custom — TIDAK auto-generated, aman dari regenerate database.types.ts / generated.types.ts

/** Kunci wilayah tanpa spasi (mis. "TanjungSantan"); daftar wilayah dinamis, dikelola di pengaturan wilayah kerja. */
export type Wilayah = string;

export type KategoriCop =
  | "negara_kedatangan"
  | "rba"
  | "faktor_risiko"
  | "kelengkapan_dokumen"
  | "daerah_terjangkit"
  | "keberadaan_vektor"
  | "bendera_kapal";

export type PeranUser = 'admin' | 'petugas' | 'petugas_klinik' | 'poliklinik' | 'klinik_binaan';