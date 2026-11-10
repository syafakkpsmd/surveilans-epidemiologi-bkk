/**
 * lib/pemantauan-laporan/katalog.ts
 *
 * Katalog SEMUA kegiatan/modul yang bisa masuk pemantauan Ketepatan & Kelengkapan Laporan.
 * Murni (tanpa database), aman dipakai komponen 'use client'.
 *
 * Katalog hanya menjelaskan: dari tabel mana data kegiatan dibaca dan wilayah mana yang wajib melapor.
 * Kegiatan itu masuk laporan MINGGUAN, BULANAN, atau SIKLUS (target per tahun) ditentukan ADMIN
 * (tabel kegiatan_laporan, halaman /dashboard/pengaturan-pemantauan-laporan). Menambah modul baru = tambah satu entri di KATALOG.
 */

import type { KunciModulWilker } from '@/lib/wilayah-kerja/modul';

/** NONAKTIF = tidak dipantau. */
export type PeriodeKegiatan = 'MINGGUAN' | 'BULANAN' | 'SIKLUS' | 'NONAKTIF';
export const DAFTAR_PERIODE: readonly PeriodeKegiatan[] = ['MINGGUAN', 'BULANAN', 'SIKLUS', 'NONAKTIF'];
export const LABEL_PERIODE: Record<PeriodeKegiatan, string> = {
  MINGGUAN: 'Mingguan',
  BULANAN: 'Bulanan',
  SIKLUS: 'Siklus (target per tahun)',
  NONAKTIF: 'Tidak dipantau',
};

/**
 * Siapa yang wajib melapor:
 *  pelabuhan / bandara / semua : wilayah kerja aktif menurut jenisnya (bukan Kantor)
 *  wilker_modul                : wilayah yang dicentang admin untuk modul itu di /dashboard/pengaturan-wilayah-kerja
 *  bkk                         : satu laporan tingkat BKK (PIE Nasional/Global)
 */
export type Cakupan = 'pelabuhan' | 'bandara' | 'semua' | 'wilker_modul' | 'bkk';

export interface SumberData {
  tabel: string;
  /** Kolom tanggal kegiatan. Kosong bila tabel memakai tahun & minggu epidemiologi (lihat `epid`). */
  kolomTanggal?: string;
  /** Tabel yang menyimpan tahun & minggu epidemiologi langsung (tidak punya tanggal): hanya bisa MINGGUAN. */
  epid?: { tahun: string; minggu: string };
  /** Kolom wilayah. Kosong untuk laporan tingkat BKK. */
  kolomWilayah?: string;
  /** 'kode' = isi kolom sudah kode wilker (WK01); 'nama' = teks nama wilayah, dipetakan lewat kamus wilker. */
  bentukWilayah?: 'kode' | 'nama';
  /** Calon kolom waktu input data (dipakai untuk menilai ketepatan); dipilih yang ada di tabel. */
  kolomWaktuInput: readonly string[];
  /** Tambahan kondisi SQL TETAP (bukan input pengguna). */
  filter?: string;
}

export interface KegiatanKatalog {
  kunci: string;
  label: string;
  kelompok: string;
  cakupan: Cakupan;
  /** Wajib bila cakupan = 'wilker_modul'. */
  kunciModulWilker?: KunciModulWilker;
  sumber: SumberData;
}

const WAKTU = ['created_at', 'dibuat_pada'] as const;

export const KATALOG: readonly KegiatanKatalog[] = [
  // ---- Alat angkut ----
  { kunci: 'cop', label: 'COP (kedatangan kapal)', kelompok: 'Alat Angkut', cakupan: 'pelabuhan',
    sumber: { tabel: 'kegiatan_cop', kolomTanggal: 'tgl_kedatangan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'phqc', label: 'PHQC (keberangkatan kapal)', kelompok: 'Alat Angkut', cakupan: 'pelabuhan',
    sumber: { tabel: 'kegiatan_phqc', kolomTanggal: 'tgl_keberangkatan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'pesawat', label: 'Pesawat (data final)', kelompok: 'Alat Angkut', cakupan: 'bandara',
    sumber: { tabel: 'kegiatan_pesawat', kolomTanggal: 'tanggal', kolomWilayah: 'kode_wilker', bentukWilayah: 'kode', kolomWaktuInput: WAKTU, filter: "status_data = 'final'" } },

  // ---- Vektor ----
  { kunci: 'dbd', label: 'Vektor DBD (Aedes)', kelompok: 'Vektor', cakupan: 'semua',
    sumber: { tabel: 'vektor_dbd', kolomTanggal: 'tgl_survei', kolomWilayah: 'kode_wilker', bentukWilayah: 'kode', kolomWaktuInput: WAKTU } },
  { kunci: 'tikus', label: 'Vektor Tikus', kelompok: 'Vektor', cakupan: 'semua',
    sumber: { tabel: 'vektor_tikus', kolomTanggal: 'tgl_survei', kolomWilayah: 'kode_wilker', bentukWilayah: 'kode', kolomWaktuInput: WAKTU } },
  { kunci: 'anoph', label: 'Vektor Anopheles', kelompok: 'Vektor', cakupan: 'semua',
    sumber: { tabel: 'vektor_anopheles', kolomTanggal: 'tgl_survei', kolomWilayah: 'kode_wilker', bentukWilayah: 'kode', kolomWaktuInput: WAKTU } },
  { kunci: 'lalat', label: 'Vektor Lalat', kelompok: 'Vektor', cakupan: 'semua',
    sumber: { tabel: 'vektor_diare', kolomTanggal: 'tgl_kegiatan', kolomWilayah: 'kode_wilker', bentukWilayah: 'kode', kolomWaktuInput: WAKTU, filter: "lower(jenis_kegiatan) = 'lalat'" } },
  { kunci: 'kecoa', label: 'Vektor Kecoa', kelompok: 'Vektor', cakupan: 'semua',
    sumber: { tabel: 'vektor_diare', kolomTanggal: 'tgl_kegiatan', kolomWilayah: 'kode_wilker', bentukWilayah: 'kode', kolomWaktuInput: WAKTU, filter: "lower(jenis_kegiatan) = 'kecoa'" } },

  // ---- Sanitasi & lingkungan ----
  { kunci: 'tpp', label: 'Sanitasi TPP', kelompok: 'Sanitasi', cakupan: 'wilker_modul', kunciModulWilker: 'tpp',
    sumber: { tabel: 'tpp', kolomTanggal: 'tanggal_kegiatan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'ttu', label: 'Sanitasi TTU', kelompok: 'Sanitasi', cakupan: 'wilker_modul', kunciModulWilker: 'ttu',
    sumber: { tabel: 'ttu', kolomTanggal: 'tanggal', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'pab', label: 'Sanitasi PAB', kelompok: 'Sanitasi', cakupan: 'wilker_modul', kunciModulWilker: 'pab',
    sumber: { tabel: 'pab', kolomTanggal: 'tanggal', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'limbah_b3', label: 'Pemeriksaan Limbah B3 Klinik', kelompok: 'Sanitasi', cakupan: 'wilker_modul', kunciModulWilker: 'limbah_b3',
    sumber: { tabel: 'limbah_b3', kolomTanggal: 'tanggal_pemeriksaan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'udara_ruang', label: 'Pemeriksaan Udara Dalam Ruang', kelompok: 'Sanitasi', cakupan: 'wilker_modul', kunciModulWilker: 'udara_ruang',
    sumber: { tabel: 'kualitas_udara_harian', kolomTanggal: 'tanggal', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },

  // ---- Lalu lintas orang ----
  { kunci: 'poliklinik', label: 'Kunjungan Poliklinik', kelompok: 'Lalu Lintas Orang', cakupan: 'wilker_modul', kunciModulWilker: 'poliklinik',
    sumber: { tabel: 'kunjungan_poliklinik', kolomTanggal: 'tanggal_pemeriksaan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'penumpang_kapal', label: 'Penumpang Kapal', kelompok: 'Lalu Lintas Orang', cakupan: 'wilker_modul', kunciModulWilker: 'penumpang_kapal',
    sumber: { tabel: 'data_penumpang_kapal', kolomTanggal: 'tanggal_tiba', kolomWilayah: 'wilker', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'siaos', label: 'SIAOS', kelompok: 'Lalu Lintas Orang', cakupan: 'wilker_modul', kunciModulWilker: 'siaos',
    sumber: { tabel: 'siaos', kolomTanggal: 'tanggal', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'kier', label: 'KIER Kesehatan', kelompok: 'Lalu Lintas Orang', cakupan: 'wilker_modul', kunciModulWilker: 'kier',
    sumber: { tabel: 'kier_kesehatan', kolomTanggal: 'tanggal_pemeriksaan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'skdr', label: 'SKDR', kelompok: 'Lalu Lintas Orang', cakupan: 'wilker_modul', kunciModulWilker: 'skdr',
    sumber: { tabel: 'skdr_mingguan', epid: { tahun: 'tahun_epid', minggu: 'minggu_epid' }, kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'pie_nasional', label: 'PIE Nasional', kelompok: 'Lalu Lintas Orang', cakupan: 'bkk',
    sumber: { tabel: 'laporan_penyakit_nasional', epid: { tahun: 'tahun_epid', minggu: 'minggu_epid' }, kolomWaktuInput: WAKTU } },
  { kunci: 'pie_global', label: 'PIE Global', kelompok: 'Lalu Lintas Orang', cakupan: 'bkk',
    sumber: { tabel: 'laporan_penyakit_emerging', epid: { tahun: 'tahun_epid', minggu: 'minggu_epid' }, kolomWaktuInput: WAKTU, filter: "jenis_periode = 'mingguan'" } },

  // ---- Surveilans klinik ----
  { kunci: 'tb', label: 'Surveilans TB', kelompok: 'Surveilans Klinik', cakupan: 'wilker_modul', kunciModulWilker: 'tb',
    sumber: { tabel: 'tb_data', kolomTanggal: 'tanggal_pelaksanaan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'hiv', label: 'Surveilans HIV', kelompok: 'Surveilans Klinik', cakupan: 'wilker_modul', kunciModulWilker: 'hiv',
    sumber: { tabel: 'hiv_data', kolomTanggal: 'tanggal_kegiatan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
  { kunci: 'malaria', label: 'Migrasi Malaria', kelompok: 'Surveilans Klinik', cakupan: 'wilker_modul', kunciModulWilker: 'malaria',
    sumber: { tabel: 'migrasi_malaria', kolomTanggal: 'tanggal_kegiatan', kolomWilayah: 'wilayah_kerja', bentukWilayah: 'nama', kolomWaktuInput: WAKTU } },
];

export const KATALOG_PER_KUNCI: ReadonlyMap<string, KegiatanKatalog> = new Map(KATALOG.map((k) => [k.kunci, k]));

/** Periode yang boleh dipilih admin: sumber berbasis minggu epidemiologi hanya bisa MINGGUAN. */
export function periodeBoleh(k: KegiatanKatalog): readonly PeriodeKegiatan[] {
  return k.sumber.epid ? ['MINGGUAN', 'NONAKTIF'] : DAFTAR_PERIODE;
}

/** Pengaturan satu kegiatan (gabungan katalog + tabel kegiatan_laporan). */
export interface KonfigKegiatan {
  kunci: string;
  periode: PeriodeKegiatan;
  /** Hanya bermakna untuk periode SIKLUS. */
  targetPerTahun: number | null;
  intervalHari: number | null;
  /** true = interval dihitung dalam hari kerja (Senin-Jumat). */
  hariKerja: boolean;
  /** 'MM-DD': awal siklus ke-1 setiap tahun. */
  mulaiSiklus: string;
  /** Batas input: hari setelah siklus berakhir. */
  tenggangHari: number;
}

/** Bawaan bila kegiatan belum ada di tabel kegiatan_laporan (sama dengan isi awal migrasi 26). */
const MINGGUAN_BAWAAN = new Set(['cop', 'phqc', 'pesawat', 'poliklinik', 'penumpang_kapal', 'siaos', 'kier', 'skdr', 'pie_nasional', 'pie_global']);

export function konfigBawaan(kunci: string): KonfigKegiatan {
  return {
    kunci,
    periode: MINGGUAN_BAWAAN.has(kunci) ? 'MINGGUAN' : 'BULANAN',
    targetPerTahun: 6,
    intervalHari: 40,
    hariKerja: true,
    mulaiSiklus: '01-01',
    tenggangHari: 10,
  };
}
