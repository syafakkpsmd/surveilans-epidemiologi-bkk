// Kategori valid untuk breakdown COP (lihat UNION ALL di view SQL terkait)
export type KategoriCop =
  | 'negara_kedatangan'
  | 'rba'
  | 'faktor_risiko'
  | 'kelengkapan_dokumen'
  | 'daerah_terjangkit'
  | 'keberadaan_vektor'
  | 'bendera_kapal';

// Kategori valid untuk breakdown PHQC (lihat UNION ALL di view SQL terkait)
export type KategoriPhqc =
  | 'bendera'
  | 'rba'
  | 'tujuan_berlayar'
  | 'pelabuhan_kedatangan'
  | 'pelabuhan_tujuan';

export interface KategoriBreakdownMingguanCop {
  tahun_epid: number;
  minggu_epid: number;
  wilayah_kerja: string | null;
  kategori: KategoriCop;
  nilai: string;
  jumlah: number;
}

export interface KategoriBreakdownBulananCop {
  tahun: number;
  bulan: number;
  wilayah_kerja: string | null;
  kategori: KategoriCop;
  nilai: string;
  jumlah: number;
}

export interface KategoriBreakdownMingguanPhqc {
  tahun_epid: number;
  minggu_epid: number;
  wilayah_kerja: string | null;
  kategori: KategoriPhqc;
  nilai: string;
  jumlah: number;
}

export interface KategoriBreakdownBulananPhqc {
  tahun: number;
  bulan: number;
  wilayah_kerja: string | null;
  kategori: KategoriPhqc;
  nilai: string;
  jumlah: number;
}