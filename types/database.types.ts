export * from './generated.types';
import type { Database } from './generated.types';

// ============================================================
// DOMAIN ENUM (manual, bukan hasil generate)
// ============================================================
export type Wilayah =
  | 'Samarinda'
  | 'TanjungSantan'
  | 'TanjungLaut'
  | 'Lhoktuan'
  | 'Sangatta'
  | 'Sangkulirang';

export type Rba = 'Hijau' | 'Kuning' | 'Merah';

export type PeranUser = 'petugas' | 'admin';

export type KegiatanCop = {
  wilayah_kerja: Wilayah;
  nama_kapal: string;
  bendera_kapal: string;
  negara_kedatangan: string;
  tgl_kedatangan: string;
  jml_abk_wna: number;
  jml_abk_wni: number;
  rba: Rba;
  faktor_risiko: string | null;
  daerah_terjangkit: string | null;
  kelengkapan_dokumen: string | null;
  orang_sakit: string | null;
  keberadaan_vektor: string | null;
  sanitasi: string | null;
  status_kirim: string;
};

export type KegiatanPhqc = {
  wilayah_kerja: Wilayah;
  nama_kapal: string;
  bendera: string;
  jml_abk_wna: number;
  jml_abk_wni: number;
  jml_penumpang_wna: number;
  jml_penumpang_wni: number;
  tgl_keberangkatan: string;
  tujuan_berlayar: string | null;
  pelabuhan_kedatangan: string | null;
  pelabuhan_tujuan: string | null;
  rba: Rba;
  status_kirim: string;
};

export type KegiatanCopEnriched = KegiatanCop & {
  tahun_epid: number;
  minggu_epid: number;
  tahun_kalender: number;
  bulan_kalender: number;
  total_abk: number;
};

export type KegiatanPhqcEnriched = KegiatanPhqc & {
  tahun_epid: number;
  minggu_epid: number;
  tahun_kalender: number;
  bulan_kalender: number;
  total_abk: number;
  total_penumpang: number;
};

export type RingkasanMingguanCop = {
  tahun_epid: number;
  minggu_epid: number;
  wilayah_kerja: Wilayah;
  jumlah_kapal: number;
  total_abk: number;
  total_abk_wna: number;
  total_abk_wni: number;
};

export type RingkasanBulananCop = {
  tahun: number;
  bulan: number;
  wilayah_kerja: Wilayah;
  jumlah_kapal: number;
  total_abk: number;
  total_abk_wna: number;
  total_abk_wni: number;
};

export type RingkasanMingguanPhqc = {
  tahun_epid: number;
  minggu_epid: number;
  wilayah_kerja: Wilayah;
  jumlah_kapal: number;
  total_abk: number;
  total_abk_wna: number;
  total_abk_wni: number;
  total_penumpang: number;
  total_penumpang_wna: number;
  total_penumpang_wni: number;
};

export type RingkasanBulananPhqc = {
  tahun: number;
  bulan: number;
  wilayah_kerja: Wilayah;
  jumlah_kapal: number;
  total_abk: number;
  total_abk_wna: number;
  total_abk_wni: number;
  total_penumpang: number;
  total_penumpang_wna: number;
  total_penumpang_wni: number;
};

export type KategoriCop =
  | 'negara_kedatangan'
  | 'rba'
  | 'faktor_risiko'
  | 'kelengkapan_dokumen'
  | 'daerah_terjangkit'
  | 'keberadaan_vektor'
  | 'bendera_kapal';

export type KategoriPhqc =
  | 'bendera'
  | 'rba'
  | 'tujuan_berlayar'
  | 'pelabuhan_kedatangan'
  | 'pelabuhan_tujuan';

export type KategoriBreakdownMingguan<K extends string = string> = {
  tahun_epid: number;
  minggu_epid: number;
  wilayah_kerja: Wilayah;
  kategori: K;
  nilai: string;
  jumlah: number;
};

export type KategoriBreakdownMingguanCop = KategoriBreakdownMingguan<KategoriCop>;
export type KategoriBreakdownMingguanPhqc = KategoriBreakdownMingguan<KategoriPhqc>;

export type KategoriBreakdownBulanan<K extends string = string> = {
  tahun: number;
  bulan: number;
  wilayah_kerja: Wilayah;
  kategori: K;
  nilai: string;
  jumlah: number;
};

export type KategoriBreakdownBulananCop = KategoriBreakdownBulanan<KategoriCop>;
export type KategoriBreakdownBulananPhqc = KategoriBreakdownBulanan<KategoriPhqc>;

export type KunjunganTamu = {
  id: number;
  waktu: string;
  halaman: string | null;
};

export type Profile = {
  id: string;
  role: PeranUser;
};

export type MmwrWeekResult = {
  tahun_epid: number;
  minggu_epid: number;
};

// ============================================================
// Turunan dari Database hasil generate (vektor, malaria, TB, HIV,
// wilker_ref, fasilitas). Otomatis ikut update kalau generated.types.ts
// di-generate ulang, karena cuma alias, bukan definisi manual.
// ============================================================
export type WilkerRef = Database['public']['Tables']['wilker_ref']['Row'];

export type RingkasanVektorDbdMingguan = Database['public']['Views']['view_vektor_dbd_mingguan']['Row'];
export type RingkasanVektorTikusMingguan = Database['public']['Views']['view_vektor_tikus_mingguan']['Row'];
export type RingkasanVektorAnophelesMingguan = Database['public']['Views']['view_vektor_anopheles_mingguan']['Row'];
export type RingkasanVektorDiareMingguan = Database['public']['Views']['view_vektor_diare_mingguan']['Row'];
export type RingkasanMalariaMingguan = Database['public']['Views']['view_malaria_mingguan']['Row'];
export type RingkasanTbMingguan = Database['public']['Views']['view_tb_mingguan']['Row'];
export type RingkasanHivMingguan = Database['public']['Views']['view_hiv_mingguan']['Row'];
export type TipeProviderAi = 'gemini' | 'openai_compatible';

export type PengaturanAi = Database['public']['Tables']['pengaturan_ai']['Row'];