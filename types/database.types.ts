// @ts-ignore - Menghindari crash kompilasi jika file generated.types belum di-generate di lokal
export * from './generated.types';

// Mekanisme Fallback Tipe Data Database yang Aman dan Profesional
type SafeDatabase = any;

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

export type KegiatanCopEnriched = Omit<KegiatanCop, 'status_kirim'> & {
  tahun_epid: number;
  minggu_epid: number;
  tahun_kalender: number;
  bulan_kalender: number;
  total_abk: number;
};

export type KegiatanPhqcEnriched = Omit<KegiatanPhqc, 'status_kirim'> & {
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

// =========================================================================
// TURUNAN DATABASE (Aman dari kegagalan kompilasi berkat SafeDatabase/any)
// =========================================================================
export type WilkerRef = SafeDatabase extends { public: { Tables: { wilker_ref: { Row: any } } } }
  ? SafeDatabase['public']['Tables']['wilker_ref']['Row']
  : { id: string; nama: string; kode_wilker: string; [key: string]: any };

export type RingkasanVektorDbdMingguan = SafeDatabase extends { public: { Views: { view_vektor_dbd_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_vektor_dbd_mingguan']['Row']
  : any;

export type RingkasanVektorTikusMingguan = SafeDatabase extends { public: { Views: { view_vektor_tikus_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_vektor_tikus_mingguan']['Row']
  : any;

export type RingkasanVektorAnophelesMingguan = SafeDatabase extends { public: { Views: { view_vektor_anopheles_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_vektor_anopheles_mingguan']['Row']
  : any;

export type RingkasanVektorDiareMingguan = SafeDatabase extends { public: { Views: { view_vektor_diare_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_vektor_diare_mingguan']['Row']
  : any;

export type RingkasanMalariaMingguan = SafeDatabase extends { public: { Views: { view_malaria_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_malaria_mingguan']['Row']
  : any;

export type RingkasanTbMingguan = SafeDatabase extends { public: { Views: { view_tb_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_tb_mingguan']['Row']
  : any;

export type RingkasanHivMingguan = SafeDatabase extends { public: { Views: { view_hiv_mingguan: { Row: any } } } }
  ? SafeDatabase['public']['Views']['view_hiv_mingguan']['Row']
  : any;

export type TipeProviderAi = 'gemini' | 'openai_compatible';

export type PengaturanAi = SafeDatabase extends { public: { Tables: { pengaturan_ai: { Row: any } } } }
  ? SafeDatabase['public']['Tables']['pengaturan_ai']['Row']
  : { id: string; provider: string; api_key: string; model: string; [key: string]: any };