// lib/input-data/modul-izin-jenazah.ts
// Surat izin angkut jenazah (jenazah, abu jenazah, kerangka jenazah) dari Sinkarkes: laporan "Rekap Surat Izin Jenazah".
// MURNI (tanpa database / exceljs), aman dipakai komponen 'use client'. Didaftarkan di MODUL (modul.ts).
//
// Berkas ekspor Sinkarkes dapat diunggah APA ADANYA, tanpa dibersihkan atau diedit:
//   * baris judul tabel dicari otomatis (di atasnya ada judul laporan dan blok ringkasan, kolom "No" diabaikan);
//   * tanggal (Tgl Lahir, Tanggal Diterbitkan) dibaca dengan berbagai model penulisan;
//   * "Nama KKP" dipetakan ke wilayah kerja; kode dalam kurung seperti "(AAP)" diabaikan;
//   * "No Surat" dirapikan (spasi dibuang): "SR.02.06/C.X.10.9/ 5026  /2026" -> "SR.02.06/C.X.10.9/5026/2026";
//   * baris dengan wilayah + nomor surat + tanggal diterbitkan yang sama DIPERBARUI, bukan digandakan, jadi
//     mengunggah ulang ekspor yang tumpang tindih aman.
// Kolom mengikuti tabel izin_jenazah (schema/postgres/izin_jenazah.sql); panjang `maks` dijaga oleh
// scripts/migrate/uji-izin-jenazah.ts.
import type { JenisWilker } from '@/lib/wilayah-kerja';
import type { KolomModul, ModulInput } from './modul';

const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
/** Kolom `text` di database tidak berbatas; di aplikasi dibatasi supaya isian tidak tak terkendali. */
const PANJANG = 2000;

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

const izinJenazah: ModulInput = {
  kunci: 'izin_jenazah',
  label: 'Izin Jenazah',
  tabel: 'izin_jenazah',
  kolomTanggal: 'tanggal_diterbitkan',
  kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'no_surat',
  namaKunci: 'nomor surat',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas'],
  kolomDaftar: ['tanggal_diterbitkan', 'no_surat', 'wilayah_kerja', 'izin_angkut', 'nama', 'jenis_kelamin', 'diangkut_tiba', 'kkp_tempat'],
  kolom: [
    T('no_surat', 'No Surat', ['Nomor Surat'], { wajib: true, maks: 100, tanpaSpasi: true, kelompok: 'Surat izin' }),
    T('izin_angkut', 'Izin Angkut', undefined, { maks: 50 }),
    { nama: 'tanggal_diterbitkan', label: 'Tanggal Diterbitkan', tipe: 'tanggal', wajib: true, alias: ['Tgl Diterbitkan', 'Tanggal Terbit'] },
    { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ['Nama KKP', 'Wilker'] },
    T('diterbitkan_di', 'Diterbitkan Di'),
    T('nama_penerbit', 'Nama Penerbit'),
    T('pemeriksa', 'Pemeriksa'),
    T('nama', 'Nama', undefined, { kelompok: 'Jenazah' }),
    { nama: 'tanggal_lahir', label: 'Tgl Lahir', tipe: 'tanggal', tanggalLahir: true, alias: ['Tanggal Lahir'] },
    T('jenis_kelamin', 'Jenis Kelamin', ['Sex', 'JK'], { maks: 20 }),
    T('kebangsaan', 'Kebangsaan', undefined, { maks: 100 }),
    T('alamat', 'Alamat', undefined, { maks: PANJANG }),
    T('provinsi', 'Provinsi', undefined, { maks: 100 }),
    T('sebab_kematian', 'Sebab Kematian', undefined, { maks: PANJANG }),
    T('diangkut_tiba', 'Diangkut/Tiba', undefined, { maks: 50, kelompok: 'Pengangkutan' }),
    T('nama_keluarga_tujuan', 'Nama Keluarga Tujuan'),
    T('no_telp', 'No. Telp', ['Telepon'], { maks: 50 }),
    T('kkp_tempat', 'KKP Tempat'),
    T('maskapai_pelayaran', 'Menggunakan Maskapai/Pelayaran', ['Maskapai/Pelayaran', 'Maskapai']),
    T('bandara_pelabuhan', 'Bandara/Pelabuhan'),
  ],
};

export const MODUL_IZIN_JENAZAH: Record<string, ModulInput> = { izin_jenazah: izinJenazah };
