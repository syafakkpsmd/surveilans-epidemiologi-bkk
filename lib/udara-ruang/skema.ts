// lib/udara-ruang/skema.ts  (FILE BARU)
// SATU-SATUNYA tempat yang menyebut nama tabel dan kolom Karhutla yang SUDAH ADA. Murni, aman untuk 'use client'.
//
// ⚠ NAMA DI BAWAH ADALAH TEBAKAN dari tampilan "Data Kualitas Udara Harian" (kolom Tanggal, Lokasi, PM2.5, PM10, Suhu, HCHO, TVOC, Lembap).
//   Cocokkan dengan database Anda (SELECT column_name FROM information_schema.columns WHERE table_name = '...'),
//   ubah DI SINI saja, dan ubah pula 3 nama di bagian atas schema/postgres/10_modul_udara_ruang.sql.
//   Bila salah, kueri gagal dengan "column ... does not exist" (tidak ada data yang rusak diam-diam).
export const TABEL_UDARA = 'kualitas_udara_harian';

/** Kolom Karhutla yang sudah ada (logika -> nama kolom di database). */
export const KOLOM_LAMA = {
  tanggal: 'tanggal',
  lokasi: 'lokasi',
  pm25: 'pm25',
  pm10: 'pm10',
  suhu: 'suhu',
  hcho: 'hcho',
  tvoc: 'tvoc',
  kelembapan: 'kelembapan',
} as const;
