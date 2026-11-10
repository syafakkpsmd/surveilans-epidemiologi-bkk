// lib/input-data/modul-kier.ts
// Modul input data KIER Kesehatan (Sertifikat Pengujian Kesehatan): form + unggah Excel LANGSUNG dari
// "Rekapitulasi Sertifikat Pengujian Kesehatan" Sinkarkes (tanpa edit/cleaning) + edit baris.
// MURNI (aman dipakai komponen 'use client'). Didaftarkan di MODUL (modul.ts) lewat `...MODUL_KIER`.
//
// Hanya 8 kolom yang dibutuhkan dasbor KIER yang disimpan (sama dengan unggahan Google Sheets dulu).
// Kolom Sinkarkes lain (No, Sebagai Berikut, Tanggal Terbit, Nama Penerbit, Berlaku sampai, Nama/NIP Kepala KKP,
// Tanggal Published) otomatis diabaikan saat membaca berkas. NIP tidak disimpan: Excel menyimpannya sebagai
// angka (1,97904012010122E+17) sehingga digitnya sudah hilang.
import type { JenisWilker } from '@/lib/wilayah-kerja';
import type { KolomModul, ModulInput } from './modul';

const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Nama KKP', 'KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

const kier: ModulInput = {
  kunci: 'kier',
  label: 'KIER Kesehatan',
  tabel: 'kier_kesehatan',
  kolomTanggal: 'tanggal_pemeriksaan',
  kolomWilayah: 'wilayah_kerja',
  // Sinkarkes tidak punya nomor sertifikat: baris dikenali dari wilayah + nama + tanggal pemeriksaan
  // + tanggal lahir + tujuan. Unggah ulang berkas yang tumpang tindih memperbarui baris yang sama.
  kolomKunci: 'nama',
  kolomKunciTambahan: ['tanggal_lahir', 'tujuan_pemeriksaan'],
  namaKunci: 'nama',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas', 'petugas_klinik'],
  kolomDaftar: ['tanggal_pemeriksaan', 'wilayah_kerja', 'nama', 'tanggal_lahir', 'jenis_kelamin', 'tujuan_pemeriksaan', 'kesimpulan', 'tempat_terbit'],
  kolom: [
    { nama: 'wilayah_kerja', label: 'Nama KKP', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER, kelompok: 'Pemeriksaan' },
    { nama: 'tanggal_pemeriksaan', label: 'Tanggal Pemeriksaan', tipe: 'tanggal', wajib: true, alias: ['Tgl Pemeriksaan', 'Tanggal'] },
    T('tujuan_pemeriksaan', 'Tujuan Pemeriksaan', ['Tujuan'], { maks: 1000 }),
    T('kesimpulan', 'Kesimpulan', ['Hasil Pemeriksaan', 'Kesimpulan Pemeriksaan'], { maks: 500 }),
    T('tempat_terbit', 'Tempat Terbit', ['Diterbitkan Di'], { maks: 100 }),
    T('nama', 'Nama', ['Nama Lengkap', 'Nama Pemohon'], { wajib: true, kelompok: 'Identitas' }),
    { nama: 'tanggal_lahir', label: 'Tanggal Lahir', tipe: 'tanggal', tanggalLahir: true, alias: ['Tgl Lahir'] },
    T('jenis_kelamin', 'Jenis Kelamin', ['JK', 'Sex'], { maks: 30 }),
    T('alamat', 'Alamat', undefined, { maks: 500 }),
  ],
};

export const MODUL_KIER: Record<string, ModulInput> = { kier };