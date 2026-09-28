// lib/klinik/modulTabelConfig.ts
//
// Konfigurasi murni (tanpa import server) untuk tabel klinik yang memakai pola
// generik: Poliklinik, KIER Kesehatan, SIAOS. HIV & TB tetap punya file sendiri.
//
// PENTING: nama tabel & kunci kolom di sini disisipkan langsung ke SQL, jadi
// HARUS tetap hardcode di file ini -- jangan pernah diisi dari input user.
//
// Untuk menambah tabel baru: tambah key di ModulKey, lalu 1 entri di MODUL_KLINIK,
// lalu 1 tab di TabelKlinikTabs.tsx. Tidak perlu route/query/client baru.

export type ModulKey = "poliklinik" | "kier" | "siaos";

export interface KolomDef {
  key: string; // nama kolom di tabel Turso
  label: string; // judul kolom di preview & Excel
}

export interface ModulConfig {
  key: ModulKey;
  labelTab: string;
  judulHalaman: string;
  judulLaporan: string; // judul di baris atas file Excel
  tabel: string;
  kolomTanggal: string; // kolom tanggal yang dipakai untuk filter tahun/bulan
  kolom: KolomDef[];
  labelPJ: string; // label penanggung jawab di blok tanda tangan
  slugFile: string;
}

export const MODUL_KLINIK: Record<ModulKey, ModulConfig> = {
  poliklinik: {
    key: "poliklinik",
    labelTab: "Poliklinik",
    judulHalaman: "Data Kunjungan Poliklinik",
    judulLaporan: "LAPORAN KUNJUNGAN POLIKLINIK",
    tabel: "kunjungan_poliklinik",
    kolomTanggal: "tanggal_pemeriksaan",
    kolom: [
      { key: "tanggal_pemeriksaan", label: "Tanggal Pemeriksaan" },
      { key: "nama", label: "Nama" },
      { key: "jenis_kelamin", label: "Jenis Kelamin" },
      { key: "usia", label: "Usia" },
      { key: "diagnosa", label: "Diagnosa" },
      { key: "keterangan", label: "Keterangan" },
    ],
    labelPJ: "Penanggung Jawab Poliklinik",
    slugFile: "poliklinik",
  },
  kier: {
    key: "kier",
    labelTab: "KIER Kesehatan",
    judulHalaman: "Data KIER Kesehatan",
    judulLaporan: "LAPORAN KIER KESEHATAN",
    tabel: "kier_kesehatan",
    kolomTanggal: "tanggal_pemeriksaan",
    kolom: [
      { key: "tanggal_pemeriksaan", label: "Tanggal Pemeriksaan" },
      { key: "nama", label: "Nama" },
      { key: "tanggal_lahir", label: "Tanggal Lahir" },
      { key: "jenis_kelamin", label: "Jenis Kelamin" },
      { key: "alamat", label: "Alamat" },
      { key: "tujuan_pemeriksaan", label: "Tujuan Pemeriksaan" },
      { key: "kesimpulan", label: "Kesimpulan" },
      { key: "tempat_terbit", label: "Tempat Terbit" },
    ],
    labelPJ: "Penanggung Jawab KIER Kesehatan",
    slugFile: "kier",
  },
  siaos: {
    key: "siaos",
    labelTab: "SIAOS",
    judulHalaman: "Data SIAOS",
    judulLaporan: "DATA SIAOS",
    tabel: "siaos",
    kolomTanggal: "tanggal",
    kolom: [
      { key: "tanggal", label: "Tanggal" },
      { key: "no_surat", label: "No. Surat" },
      { key: "nama", label: "Nama" },
      { key: "pelayaran", label: "Pelayaran" },
      { key: "maskapai", label: "Maskapai" },
      { key: "pelabuhan", label: "Pelabuhan" },
      { key: "jenis_kelamin", label: "Jenis Kelamin" },
      { key: "usia", label: "Usia" },
      { key: "satuan_usia", label: "Satuan Usia" },
      { key: "diagnosa", label: "Diagnosa" },
      { key: "butuh_bantuan_medis", label: "Butuh Bantuan Medis" },
      { key: "ambulance", label: "Ambulance" },
      { key: "kondisi_lanjut_perjalanan", label: "Kondisi Lanjut Perjalanan" },
      { key: "perlu_kursi_dorong", label: "Perlu Kursi Dorong" },
      { key: "perlu_bantuan_makanan_medikasi", label: "Perlu Bantuan Makanan/Medikasi" },
    ],
    labelPJ: "Penanggung Jawab SIAOS",
    slugFile: "siaos",
  },
};

/** Ambil config dari string (mis. query param). Return null kalau bukan modul yang dikenal. */
export function ambilModul(key: string | null): ModulConfig | null {
  if (!key) return null;
  // hasOwnProperty supaya "constructor"/"__proto__" tidak lolos sebagai modul
  if (!Object.prototype.hasOwnProperty.call(MODUL_KLINIK, key)) return null;
  return MODUL_KLINIK[key as ModulKey];
}