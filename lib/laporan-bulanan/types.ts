/**
 * Tipe bersama Laporan Bulanan EPIC-AI.
 *
 * Alurnya:  pembaca modul (ModulLaporan.ambil)  ->  DataModul  ->  HasilModul
 *           HasilModul[]  ->  buildSlides()  ->  Slide[]  ->  layar (SlideView) dan PPTX
 *           HasilModul[]  ->  rakitDocx()    ->  laporan Word
 * Semua berkas di folder ini tidak bergantung pada Supabase, Turso, maupun Next.js.
 */

export type Nada = "ok" | "warn" | "bad" | "info" | "muted";

/** Satu angka utama modul, mis. "Total pemeriksaan: 1.240". */
export interface Kartu {
  label: string;
  nilai: string;
  catatan?: string;
  nada?: Nada;
}

export interface SeriTren {
  nama: string;
  /** Satu nilai per label (bulan). null = tidak ada data pada bulan itu. */
  nilai: (number | null)[];
  /** Hex tanpa #, mis. "0A7A78". Bila kosong dipilihkan dari palet. */
  warna?: string;
}

/** Deret bulanan Januari sampai bulan laporan. */
export interface Tren {
  jenis: "batang" | "garis";
  label: string[];
  seri: SeriTren[];
  /** Keterangan sumbu Y, mis. "Jumlah kapal". */
  satuan?: string;
  /** Batas sumbu Y. Berguna untuk persentase (0 sampai 100) agar variasi kecil tidak tampak berlebihan. */
  sumbuY?: { min?: number; maks?: number };
}

export interface Tabel {
  kepala: string[];
  baris: string[][];
  /** Indeks kolom yang rata kanan (angka). */
  kanan?: number[];
  /** Bobot lebar relatif tiap kolom. */
  lebar?: number[];
}

/** Hasil pembacaan satu modul untuk satu periode. */
export interface DataModul {
  kunci: string;
  judul: string;
  /** Pengelompokan di laporan, mis. "Alat Angkut dan Orang", "Vektor". */
  kelompok: string;
  /** 2 sampai 4 angka utama. */
  kartu: Kartu[];
  tren?: Tren;
  /** Rincian, mis. per wilayah kerja. Dipecah otomatis ke beberapa slide bila panjang. */
  tabel?: Tabel;
  /** Poin penting yang perlu dibahas (maksimal 4 tampil di slide). */
  temuan?: string[];
  /** Paragraf untuk laporan Word, mis. hasil Analisis AI yang sudah tersimpan. */
  narasi?: string[];
}

interface DasarHasil {
  kunci: string;
  judul: string;
  kelompok: string;
}

export type HasilModul =
  | (DasarHasil & { status: "ok"; data: DataModul })
  | (DasarHasil & { status: "kosong" })
  | (DasarHasil & { status: "gagal"; galat: string });

export interface KonteksLaporan {
  tahun: number;
  /** Bulan terakhir yang dilaporkan (1 sampai 12). Data mencakup Januari sampai bulan ini. */
  bulanAkhir: number;
}

/** Kontrak yang ditulis satu kali per modul dan didaftarkan di registri. */
export interface ModulLaporan {
  kunci: string;
  judul: string;
  kelompok: string;
  /** Kembalikan null bila modul tidak punya data pada periode itu. Lempar error bila pembacaan gagal. */
  ambil(konteks: KonteksLaporan): Promise<DataModul | null>;
}

/* ---------- Model slide (dipakai layar dan PPTX) ---------- */

export type SlideBlok =
  | { tipe: "statistik"; items: Kartu[] }
  | ({ tipe: "tabel" } & Tabel)
  | ({ tipe: "grafik" } & Tren)
  | { tipe: "poin"; items: string[] }
  | { tipe: "teks"; teks: string; nada?: Nada }
  | { tipe: "dua_kolom"; kiri: SlideBlok; kanan: SlideBlok; rasioKiri: number };

export interface Slide {
  kunci: string;
  tipe: "sampul" | "isi";
  judul: string;
  subjudul?: string;
  blok: SlideBlok[];
}

/** Pilihan pengguna di panel "Isi presentasi". */
export interface OpsiPresentasi {
  /** Kunci modul yang TIDAK disertakan. */
  modulDikecualikan: string[];
  /** Satu isu per baris; bila terisi, ditambahkan satu slide di akhir. */
  catatan: string;
  /** Slide penutup "Diskusi dan arahan pimpinan". */
  penutup: boolean;
}

export const OPSI_PRESENTASI_DEFAULT: OpsiPresentasi = {
  modulDikecualikan: [],
  catatan: "",
  penutup: true,
};

export interface OpsiLaporanWord {
  judul: string;
  subjudul: string;
  instansi: string;
  /** Dasar hukum yang dicantumkan di Bab I. Ubah sesuai peraturan yang berlaku di unit Anda. */
  dasarHukum: string[];
  /** Kunci modul yang tidak disertakan. */
  modulDikecualikan: string[];
  /** Catatan pembahasan dan rekomendasi yang ditulis tim (satu poin per elemen). */
  catatan: string[];
  kota: string;
  /** Tanggal penandatanganan, mis. "1 Oktober 2026". Bila kosong, baris tanggal dikosongkan untuk diisi tangan. */
  tanggal?: string;
  penandatangan: { jabatan: string; nama?: string; nip?: string };
}

export const OPSI_WORD_DEFAULT: OpsiLaporanWord = {
  judul: "LAPORAN BULANAN",
  subjudul: "Tim Kerja Surveilans dan Penindakan",
  instansi: "Balai Kekarantinaan Kesehatan Kelas I Samarinda",
  dasarHukum: [
    "Undang-Undang Nomor 6 Tahun 2018 tentang Kekarantinaan Kesehatan.",
    "International Health Regulations (IHR) 2005.",
  ],
  modulDikecualikan: [],
  catatan: [],
  kota: "Samarinda",
  penandatangan: { jabatan: "Ketua Tim Kerja Surveilans dan Penindakan" },
};

/** Semua yang dibutuhkan generator slide dan Word untuk satu laporan. */
export interface BahanLaporan {
  tahun: number;
  bulanAkhir: number;
  hasil: HasilModul[];
}
