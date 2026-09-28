// lib/klinik/modulTabelConfig.ts
//
// Konfigurasi murni (tanpa import server) untuk tabel klinik yang memakai pola
// generik: Poliklinik, KIER Kesehatan, SIAOS, SKLT. HIV & TB tetap punya file sendiri.
//
// PENTING: nama tabel & nama kolom di sini disisipkan langsung ke SQL, jadi
// HARUS tetap hardcode di file ini -- jangan pernah diisi dari input user.
//
// Untuk menambah tabel baru: tambah key di ModulKey dan 1 entri di MODUL_KLINIK.
// Tab di halaman & daftar wilayah kerja dibentuk otomatis dari sini.

export type ModulKey = "poliklinik" | "kier" | "siaos" | "sklt";

export interface KolomDef {
  key: string; // kunci keluaran (dipakai preview & Excel), harus unik per modul
  label: string; // judul kolom di preview & Excel
  sumber?: string; // nama kolom asli di tabel Turso kalau beda dari key (mis. maskapai -> agen)
  kosong?: boolean; // true = tidak diambil dari DB, selalu kosong (sumber datanya belum ada)
}

export interface ModulConfig {
  key: ModulKey;
  labelTab: string;
  judulHalaman: string;
  judulLaporan: string; // judul di baris atas file Excel
  tabel: string;
  punyaWilayahKerja: boolean; // false = tabel tidak punya kolom wilayah_kerja (tanpa filter/kolom wilker)
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
    punyaWilayahKerja: true,
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
    punyaWilayahKerja: true,
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
    punyaWilayahKerja: true,
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
  // SKLT: urutan & judul kolom mengikuti contoh format yang dikirim (tanpa kolom "No",
  // itu nomor urut otomatis). Tabel sklt_penumpang belum diketahui punya wilayah_kerja,
  // jadi filter/kolom wilayah kerja dimatikan; set true kalau kolomnya ada.
  sklt: {
    key: "sklt",
    labelTab: "SKLT",
    judulHalaman: "Data SKLT",
    judulLaporan: "DATA SKLT",
    tabel: "sklt_penumpang",
    punyaWilayahKerja: false,
    kolomTanggal: "tanggal",
    kolom: [
      { key: "tanggal", label: "Tanggal" },
      { key: "nama", label: "Nama" },
      { key: "nama_pesawat", label: "Nama Pesawat", sumber: "maskapai" },
      { key: "tujuan", label: "Tujuan", sumber: "rute" },
      { key: "jenis_kelamin", label: "Jenis Kelamin" },
      { key: "umur", label: "Umur" },
      { key: "diagnosa", label: "Diagnosa", sumber: "diagnosis" },
      { key: "keterangan", label: "Keterangan", sumber: "status_laik" }, // Laik / Tidak Laik
      // No SKLB/Terbang = nomor registrasi. Nama kolom "no_registrasi" ini TEBAKAN --
      // cocokkan dengan nama kolom asli di tabel sklt_penumpang (PRAGMA table_info).
      { key: "no_sklt", label: "No SKLB/Terbang", sumber: "no_registrasi" },
      { key: "agen", label: "Agen", sumber: "maskapai" },
      // PNBP belum ada sumbernya. Ganti `kosong: true` dengan `sumber: "<nama kolom>"` kalau kolomnya ada.
      { key: "pnbp", label: "PNBP", kosong: true },
    ],
    labelPJ: "Penanggung Jawab SKLT",
    slugFile: "sklt",
  },
};

/** Semua key modul, urutan mengikuti MODUL_KLINIK (dipakai untuk tab & daftar wilker). */
export const DAFTAR_MODUL_KLINIK = Object.keys(MODUL_KLINIK) as ModulKey[];

/** Ambil config dari string (mis. query param). Return null kalau bukan modul yang dikenal. */
export function ambilModul(key: string | null): ModulConfig | null {
  if (!key) return null;
  // hasOwnProperty supaya "constructor"/"__proto__" tidak lolos sebagai modul
  if (!Object.prototype.hasOwnProperty.call(MODUL_KLINIK, key)) return null;
  return MODUL_KLINIK[key as ModulKey];
}