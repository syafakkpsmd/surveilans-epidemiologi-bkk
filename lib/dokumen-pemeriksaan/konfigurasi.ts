// lib/dokumen-pemeriksaan/konfigurasi.ts
// Konfigurasi & tipe bersama (aman diimpor dari server maupun client; tidak ada rahasia di sini).

export type JenisDokumen = 'cop' | 'sscec' | 'phqc';
export const DAFTAR_JENIS: JenisDokumen[] = ['cop', 'sscec', 'phqc'];

export interface KonfigJenis {
  label: string;
  judul: string;
  labelKunci: string;
  /** Tabel data besar (nilai tetap di kode, BUKAN dari input pengguna -- aman dipakai di SQL). */
  tabelData: string;
  kolomKunci: string;
}

export const KONFIG: Record<JenisDokumen, KonfigJenis> = {
  cop: {
    label: 'COP',
    judul: 'Dokumen Pemeriksaan COP (Kedatangan Kapal)',
    labelKunci: 'QR Code',
    tabelData: 'kegiatan_cop',
    kolomKunci: 'qr_code',
  },
  sscec: {
    label: 'SSCEC',
    judul: 'Dokumen Pemeriksaan SSCEC',
    labelKunci: 'Nomor Barcode',
    tabelData: 'sertifikat_sscec',
    kolomKunci: 'nomor_barcode',
  },
  phqc: {
    label: 'PHQC',
    judul: 'Dokumen Pemeriksaan PHQC (Keberangkatan Kapal)',
    labelKunci: 'QR Code',
    tabelData: 'kegiatan_phqc',
    kolomKunci: 'qr_code',
  },
};

export const adalahJenis = (v: string): v is JenisDokumen => (DAFTAR_JENIS as string[]).includes(v);

/** Harus sama dengan sisi SQL: upper(btrim(kolom)). */
export const normalisasiKunci = (s: string): string => s.trim().toUpperCase();

export const BATAS_UKURAN_BYTE = 10 * 1024 * 1024; // 10 MB
export const TIPE_BOLEH = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const FOLDER_DASAR = 'dokumen-pemeriksaan';

export type AlasanPhqc = 'lebih_14_hari' | 'daerah_terjangkit';

export interface Berkas {
  url: string;
  publicId: string;
  tipe: 'pdf' | 'image';
  ukuran: number;
}

export interface MasukanDokumen {
  jenis: JenisDokumen;
  kunci: string;
  namaKapal: string;
  wilayahKerja: string;
  tanggalPemeriksaan: string; // YYYY-MM-DD
  keterangan: string;
  tanggalKedatangan?: string; // khusus PHQC
  alasanPhqc?: AlasanPhqc; // khusus PHQC
  berkas: Berkas[];
}

export interface DokumenBaris {
  id: number;
  kunci: string;
  namaKapal: string;
  wilayahKerja: string;
  tanggal: string;
  alasanPhqc: string | null;
  url: string;
  tipe: 'pdf' | 'image';
  diunggahOleh: string;
  diunggahPada: string;
  /** Dihitung langsung dari data besar saat halaman dibuka (selalu akurat). */
  adaDiData: boolean;
}

export type HasilAksi = { ok: true; pesan: string } | { ok: false; galat: string };