// lib/posko/konstanta.ts
// Konstanta & tipe modul Posko Nataru / Posko Idul Fitri (aman diimpor client maupun server).

export type JenisPosko = 'nataru' | 'idul_fitri';

/** Slug di URL -> jenis posko di database. */
export const SLUG_KE_JENIS: Record<string, JenisPosko> = {
  nataru: 'nataru',
  'idul-fitri': 'idul_fitri',
};

export const JENIS_KE_SLUG: Record<JenisPosko, string> = {
  nataru: 'nataru',
  idul_fitri: 'idul-fitri',
};

export const LABEL_POSKO: Record<JenisPosko, string> = {
  nataru: 'Posko Nataru',
  idul_fitri: 'Posko Idul Fitri',
};

export const WILAYAH_POSKO = ['Samarinda', 'APT Pranoto', 'Lhoktuan'] as const;
export type WilayahPosko = (typeof WILAYAH_POSKO)[number];

export const DAFTAR_PENYAKIT = [
  'DIARE AKUT',
  'MALARIA KONFIRMASI',
  'SUSPEK DENGUE',
  'PNEUMONIA',
  'DIARE BERDARAH/DISENTRI',
  'SUSPEK DEMAM TIFOID',
  'SINDROM JAUNDICE AKUT',
  'SUSPEK CHIKUNGUNYA',
  'SUSPEK FLU BURUNG PADA MANUSIA',
  'SUSPEK CAMPAK',
  'SUSPEK DIFTERI',
  'PERTUSIS',
  'ACUTE FLACID PARALYSIS (AFP)',
  'GIGITAN HEWAN PENULAR RABIES (GHPR)',
  'SUSPEK ANTRAX',
  'SUSPEK LEPTOSPIROSIS',
  'SUSPEK KOLERA',
  'SUSPEK MENINGITIS/ENCEPHALITIS',
  'SUSPEK TETANUS NEONATORUM',
  'SUSPEK TETANUS',
  'ILI (PENYAKIT SERUPA INFLUENZA)',
  'SUSPEK HFMD',
  'COVID-19 KONFIRMASI',
  'ISPA',
  'KERACUNAN PANGAN',
] as const;

export const DAFTAR_PTM = [
  'DIABETES',
  'HYPERTENSI',
  'GASTRITIS',
  'PENYAKIT KULIT (GATAL-GATAL; KUDIS)',
  'SAKIT MATA',
  'PENYAKIT JANTUNG',
  'HEAT STROKE',
] as const;

/** "Pelabuhan Samarinda" / "SAMARINDA" / "Bandara APT Pranoto" -> nama baku wilayah posko (atau null). */
export function normalisasiWilayah(nama: string | null | undefined): WilayahPosko | null {
  const kunci = String(nama ?? '')
    .replace(/^\s*(pelabuhan|bandara)\s+/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (kunci === 'samarinda') return 'Samarinda';
  if (kunci === 'aptpranoto') return 'APT Pranoto';
  if (kunci === 'lhoktuan') return 'Lhoktuan';
  return null;
}

// ---------------------------------------------------------------- tipe data
export type PeriodePosko = {
  posko: JenisPosko;
  tahun: number;
  nama: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
};

/** 1 baris = 1 tanggal x 1 wilayah, gabungan semua sumber data. */
export type BarisHarianPosko = {
  tanggal: string;
  wilayah: WilayahPosko;
  poliklinik: number;
  kapalDatang: number;
  kapalBerangkat: number;
  pesawatDatang: number;
  pesawatBerangkat: number;
  abkDatang: number;
  abkBerangkat: number;
  penumpangKapalDatang: number;
  penumpangKapalBerangkat: number;
  crewDatang: number;
  crewBerangkat: number;
  penumpangPesawatDatang: number;
  penumpangPesawatBerangkat: number;
  jumlahKlb: number;
};

export type BarisPenyakitPosko = {
  tanggal: string;
  wilayah: WilayahPosko;
  jenis: string;
  kasusLkLt5: number;
  kasusLkGe5: number;
  kasusPrLt5: number;
  kasusPrGe5: number;
  matiLkLt5: number;
  matiLkGe5: number;
  matiPrLt5: number;
  matiPrGe5: number;
};

export type BarisPtmPosko = {
  tanggal: string;
  wilayah: WilayahPosko;
  jenis: string;
  jumlah: number;
};

export type DataPosko = {
  posko: JenisPosko;
  periode: PeriodePosko | null;
  /** semua periode tersimpan untuk posko ini (terbaru dulu) -> untuk pilihan periode */
  daftarPeriode: PeriodePosko[];
  /** tanggal terakhir yang ditampilkan = min(selesai, hari ini WITA); null bila posko belum mulai */
  tanggalAkhirTampil: string | null;
  harian: BarisHarianPosko[];
  penyakit: BarisPenyakitPosko[];
  ptm: BarisPtmPosko[];
  /** catatan untuk pengguna (mis. tabel belum dibuat, sumber data gagal dimuat) */
  catatan: string[];
};

/**
 * Jendela periode bawaan relatif terhadap Hari H (bisa diubah di form "Atur Periode"):
 *  - Idul Fitri: Hari H = 1 Syawal, 14 hari sebelum s/d 14 hari sesudah.
 *  - Nataru    : Hari H = 25 Desember, 7 hari sebelum s/d 10 hari sesudah (mis. 18 Des - 4 Jan).
 */
export const JENDELA_BAWAAN: Record<JenisPosko, { sebelum: number; sesudah: number; keteranganHariH: string }> = {
  idul_fitri: { sebelum: 14, sesudah: 14, keteranganHariH: 'Hari H = 1 Syawal (Idul Fitri)' },
  nataru: { sebelum: 7, sesudah: 10, keteranganHariH: 'Hari H = 25 Desember (Natal)' },
};
