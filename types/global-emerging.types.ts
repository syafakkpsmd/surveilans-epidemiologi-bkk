// types/global-emerging.types.ts
// Tipe & konstanta untuk modul Penyakit Infeksi Emerging (Global Emerging).
// File berdiri sendiri — tidak menimpa types/database.types.ts yang sudah ada.
// Kalau mau digabung, tinggal copy isi file ini ke database.types.ts.

export const DAFTAR_PENYAKIT = [
  'Listeriosis',
  'Hantavirus',
  'Legionellosis',
  'Infeksi Virus B',
  'Mpox',
  'MERS-CoV',
  'Covid-19',
  'H5N1',
  'Demam Lassa',
  'CCHF',
  'Meningitis',
  'Oropouche',
] as const;

export const DAFTAR_NEGARA = [
  'China',
  'Filipina',
  'Hong Kong',
  'Singapura',
  'Vietnam',
  'Malaysia',
  'India',
  'Korea Selatan',
  'Taiwan',
  'Arab Saudi',
  'Jepang',
  'Thailand',
  'Bangladesh',
] as const;

export type Penyakit = (typeof DAFTAR_PENYAKIT)[number];
export type Negara = (typeof DAFTAR_NEGARA)[number];
export type JenisPeriode = 'mingguan' | 'bulanan';

// Baris mentah dari tabel laporan_penyakit_emerging
export interface LaporanPenyakitEmerging {
  id: number;
  penyakit: Penyakit;
  negara: Negara;
  jenis_periode: JenisPeriode;
  tahun_epid: number;
  minggu_epid: number | null;
  bulan: number | null;
  jumlah_kasus: number;
  jumlah_kematian: number;
  sumber: string;
  dibuat_pada: string;
}

// Baris hasil agregasi dari view_mingguan_penyakit_emerging /
// view_bulanan_penyakit_emerging
export interface RingkasanPenyakitEmerging {
  tahun_epid: number;
  minggu_epid: number | null; // null kalau jenis 'bulanan'
  bulan: number | null; // null kalau jenis 'mingguan'
  penyakit: Penyakit;
  negara: Negara;
  total_kasus: number;
  total_kematian: number;
}

// Filter yang dipakai halaman /dashboard/global-emerging (dari searchParams)
export interface FilterGlobalEmerging {
  jenis: JenisPeriode;
  tahunEpid?: number;
  penyakit?: Penyakit;
  negara?: Negara;
}
