// lib/konfigurasi/instansi.ts
// SATU-SATUNYA tempat nama instansi (BKK) yang dipakai di label laporan dan prompt analisis AI.
// BKK lain cukup mengisi variabel lingkungan (.env / Vercel), tanpa mengubah kode:
//   NAMA_BKK=BKK Kelas I Balikpapan
//   NAMA_BKK_SINGKAT=BKK Balikpapan        (opsional; bawaan: nama lengkap tanpa "Kelas ...")
// Bawaan bila tidak diisi: BKK Kelas I Samarinda. Hanya dipakai di kode server (tidak dikirim ke browser).

export const NAMA_BKK: string = process.env.NAMA_BKK?.trim() || 'BKK Kelas I Samarinda';

export const NAMA_BKK_SINGKAT: string =
  process.env.NAMA_BKK_SINGKAT?.trim() || NAMA_BKK.replace(/\s+Kelas\s+[IVX]+\b/i, '');
