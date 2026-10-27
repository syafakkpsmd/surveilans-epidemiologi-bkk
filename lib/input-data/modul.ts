// lib/input-data/modul.ts
// Konfigurasi modul input data + unggah Excel. MURNI (tanpa database / exceljs) sehingga aman
// dipakai komponen 'use client'. Menambah modul baru = menambah satu entri di MODUL.
import { WILAYAH_KERJA, kodeDariTeks, type KodeWilker } from '@/lib/wilayah-kerja';

export type TipeKolom = 'teks' | 'bilangan' | 'tanggal' | 'rba' | 'wilker';

export interface KolomModul {
  /** Nama kolom di tabel. */
  nama: string;
  /** Judul kolom pada template Excel dan form. */
  label: string;
  tipe: TipeKolom;
  wajib?: boolean;
  /** Penulisan lain judul kolom yang diterima saat membaca Excel (selain label dan nama kolom). */
  alias?: string[];
}

export interface ModulInput {
  kunci: string;
  label: string;
  tabel: string;
  /** Kolom tanggal yang menentukan TAHUN data (dipakai pemilih tahun dan cakupan ganti). */
  kolomTanggal: string;
  /** Kolom wilayah kerja. */
  kolomWilayah: string;
  /** Wilayah kerja yang boleh pada modul ini. */
  wilayahBoleh: KodeWilker[];
  kolom: KolomModul[];
  /** Kolom yang ditampilkan di daftar data. */
  kolomDaftar: string[];
  /** Peran yang boleh menambah/mengunggah. Hapus selalu khusus admin. */
  peranBoleh: ('admin' | 'petugas' | 'petugas_klinik')[];
}

const WILKER_KAPAL: KodeWilker[] = ['WK01', 'WK02', 'WK03', 'WK04', 'WK05', 'WK06'];

export const MODUL: Record<string, ModulInput> = {
  cop: {
    kunci: 'cop',
    label: 'COP (kedatangan kapal)',
    tabel: 'kegiatan_cop',
    kolomTanggal: 'tgl_kedatangan',
    kolomWilayah: 'wilayah_kerja',
    wilayahBoleh: WILKER_KAPAL,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_kedatangan', 'wilayah_kerja', 'nama_kapal', 'bendera_kapal', 'negara_kedatangan', 'jml_abk_wna', 'jml_abk_wni', 'rba'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ['Wilker', 'Pelabuhan'] },
      { nama: 'nama_kapal', label: 'Nama Kapal', tipe: 'teks', wajib: true },
      { nama: 'bendera_kapal', label: 'Bendera Kapal', tipe: 'teks', alias: ['Bendera'] },
      { nama: 'negara_kedatangan', label: 'Negara Kedatangan', tipe: 'teks', alias: ['Negara Asal', 'Negara'] },
      { nama: 'tgl_kedatangan', label: 'Tanggal Kedatangan', tipe: 'tanggal', wajib: true, alias: ['Tgl Kedatangan', 'Tanggal'] },
      { nama: 'jml_abk_wna', label: 'Jumlah ABK WNA', tipe: 'bilangan', alias: ['ABK WNA'] },
      { nama: 'jml_abk_wni', label: 'Jumlah ABK WNI', tipe: 'bilangan', alias: ['ABK WNI'] },
      { nama: 'rba', label: 'RBA', tipe: 'rba', alias: ['Risk Based Assessment'] },
      { nama: 'faktor_risiko', label: 'Faktor Risiko', tipe: 'teks' },
      { nama: 'daerah_terjangkit', label: 'Daerah Terjangkit', tipe: 'teks' },
      { nama: 'kelengkapan_dokumen', label: 'Kelengkapan Dokumen', tipe: 'teks' },
      { nama: 'orang_sakit', label: 'Orang Sakit', tipe: 'teks' },
      { nama: 'keberadaan_vektor', label: 'Keberadaan Vektor', tipe: 'teks' },
      { nama: 'sanitasi', label: 'Sanitasi', tipe: 'teks' },
    ],
  },
  phqc: {
    kunci: 'phqc',
    label: 'PHQC (keberangkatan kapal)',
    tabel: 'kegiatan_phqc',
    kolomTanggal: 'tgl_keberangkatan',
    kolomWilayah: 'wilayah_kerja',
    wilayahBoleh: WILKER_KAPAL,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_keberangkatan', 'wilayah_kerja', 'nama_kapal', 'bendera', 'pelabuhan_tujuan', 'jml_abk_wna', 'jml_abk_wni', 'jml_penumpang_wna', 'jml_penumpang_wni', 'rba'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ['Wilker', 'Pelabuhan'] },
      { nama: 'nama_kapal', label: 'Nama Kapal', tipe: 'teks', wajib: true },
      { nama: 'bendera', label: 'Bendera', tipe: 'teks', alias: ['Bendera Kapal'] },
      { nama: 'pelabuhan_tujuan', label: 'Pelabuhan Tujuan', tipe: 'teks' },
      { nama: 'tgl_keberangkatan', label: 'Tanggal Keberangkatan', tipe: 'tanggal', wajib: true, alias: ['Tgl Keberangkatan', 'Tanggal'] },
      { nama: 'jml_abk_wna', label: 'Jumlah ABK WNA', tipe: 'bilangan', alias: ['ABK WNA'] },
      { nama: 'jml_abk_wni', label: 'Jumlah ABK WNI', tipe: 'bilangan', alias: ['ABK WNI'] },
      { nama: 'jml_penumpang_wna', label: 'Jumlah Penumpang WNA', tipe: 'bilangan', alias: ['Penumpang WNA'] },
      { nama: 'jml_penumpang_wni', label: 'Jumlah Penumpang WNI', tipe: 'bilangan', alias: ['Penumpang WNI'] },
      { nama: 'pelabuhan_kedatangan', label: 'Pelabuhan Kedatangan', tipe: 'teks' },
      { nama: 'rba', label: 'RBA', tipe: 'rba', alias: ['Risk Based Assessment'] },
      { nama: 'tujuan_berlayar', label: 'Tujuan Berlayar', tipe: 'teks' },
    ],
  },
};

export const DAFTAR_MODUL = Object.values(MODUL);

export function dapatkanModul(kunci: string): ModulInput | undefined {
  return Object.prototype.hasOwnProperty.call(MODUL, kunci) ? MODUL[kunci] : undefined;
}

/** Bentuk penyimpanan wilayah di tabel kegiatan_* saat ini: nama pendek tanpa spasi ("TanjungSantan").
 *  Dibakukan menjadi kode WK pada langkah B-2 (lihat docs/MIGRASI_MARIADB.md). */
export function wilayahTersimpan(kode: KodeWilker): string {
  const w = WILAYAH_KERJA.find((x) => x.kode === kode);
  return (w?.namaPendek ?? kode).replace(/\s+/g, '');
}

/** Kebalikannya, untuk filter di daftar; teks tak dikenal -> null. */
export function kodeDariTersimpan(teks: string | null | undefined): KodeWilker | null {
  return kodeDariTeks(teks);
}

/** Normalisasi judul kolom Excel: huruf kecil, hanya huruf/angka. "Tgl. Kedatangan " -> "tglkedatangan". */
export function kunciJudul(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
