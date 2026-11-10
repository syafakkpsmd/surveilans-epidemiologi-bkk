// lib/input-data/modul-sklt.ts
// Modul input data SKLT (Surat Keterangan Laik Terbang): form + unggah Excel LANGSUNG dari
// "Rekapitulasi Penerbitan Sertifikat Laik Terbang" Sinkarkes (tanpa edit/cleaning) + edit baris.
// MURNI (aman dipakai komponen 'use client'). Didaftarkan di MODUL (modul.ts) lewat `...MODUL_SKLT`.
//
// Hanya kolom yang dibutuhkan dasbor SKLT yang disimpan (sama dengan unggahan Google Sheets dulu).
// Kolom Sinkarkes lain (No, Alamat, TD, Sp02, NIP, nama petugas, dst.) otomatis diabaikan saat membaca berkas.
// NIP sengaja tidak disimpan: Excel menyimpannya sebagai angka (1,97101151998031E+17) sehingga digitnya sudah hilang.
import type { KolomModul, ModulInput } from './modul';
import { namaTujuanDariRute } from './rute-bandara';

const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Nama KKP', 'KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

const sklt: ModulInput = {
  kunci: 'sklt',
  label: 'SKLT (Laik Terbang)',
  tabel: 'sklt_penumpang',
  kolomTanggal: 'tanggal',
  kolomWilayah: 'wilayah_kerja',
  // Satu sertifikat = satu nomor registrasi; unggah ulang berkas yang tumpang tindih memperbarui baris yang sama.
  kolomKunci: 'no_registrasi',
  namaKunci: 'nomor registrasi',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: ['Bandara'],
  peranBoleh: ['admin', 'petugas', 'petugas_klinik'],
  kolomDaftar: ['tanggal', 'wilayah_kerja', 'no_registrasi', 'nama', 'umur', 'jenis_kelamin', 'maskapai', 'rute', 'diagnosis', 'status_laik'],
  kolom: [
    { nama: 'wilayah_kerja', label: 'Nama KKP', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER, kelompok: 'Penerbangan' },
    { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Penerbangan'] },
    T('maskapai', 'Maskapai', ['Nama Maskapai', 'Airline']),
    // Kode rute apa adanya dari Sinkarkes (AAP-SUB); nama tujuannya diturunkan otomatis ke kolom `rute`.
    T('rute_kode', 'Rute', ['Kode Rute', 'Rute Penerbangan'], { maks: 100 }),
    T('no_registrasi', 'No Registrasi', ['Nomor Registrasi', 'No Reg', 'No SKLT'], { wajib: true, maks: 100, kelompok: 'Penumpang' }),
    T('nama', 'Nama Calon Penumpang', ['Nama Penumpang', 'Nama'], { wajib: true }),
    { nama: 'umur', label: 'Umur', tipe: 'bilangan', alias: ['Usia'], batasNilai: [0, 120] },
    T('jenis_kelamin', 'Jenis Kelamin', ['JK', 'Sex'], { maks: 20 }),
    T('diagnosis', 'Diagnosis', ['Diagnosa'], { maks: 2000, kelompok: 'Pemeriksaan' }),
    T('jenis_penyakit', 'Penyakit Menular/Bukan Menular', ['Jenis Penyakit'], { maks: 100 }),
    { nama: 'gcs', label: 'GCS', tipe: 'bilangan', batasNilai: [3, 15] },
    { nama: 'nadi', label: 'Nadi', tipe: 'bilangan', alias: ['Nadi (x/menit)'], batasNilai: [0, 300] },
    { nama: 'suhu', label: 'Suhu', tipe: 'desimal', alias: ['Suhu (C)', 'Suhu Badan'], batasNilai: [30, 45] },
    T('hamil', 'Hamil', undefined, { maks: 20 }),
    T('pendamping', 'Membutuhkan Pendamping', ['Pendamping'], { maks: 50 }),
    T('fasilitas', 'Fasilitas yang dibutuhkan', ['Fasilitas']),
    T('status_laik', 'Laik/Tidak Laik', ['Status Laik', 'Laik', 'Keterangan'], { maks: 50, kelompok: 'Hasil' }),
    // TURUNAN: nama tujuan dari kode rute (dasbor SKLT membaca kolom `rute` berisi nama, bukan kode).
    { nama: 'rute', label: 'Tujuan (otomatis)', tipe: 'teks', arsip: true, turunan: (n) => namaTujuanDariRute(n.rute_kode as string | null) },
  ],
};

export const MODUL_SKLT: Record<string, ModulInput> = { sklt };