// lib/konfigurasi/instansi.ts
// SATU-SATUNYA tempat identitas instansi (BKK) untuk label, judul, poster, laporan, dan prompt analisis AI.
// Aman dipakai di kode server maupun komponen 'use client'.
//
// BKK lain cukup mengisi variabel lingkungan (.env.local / Vercel) lalu build ulang, tanpa mengubah kode:
//   NEXT_PUBLIC_NAMA_BKK=BKK Kelas I Balikpapan
//   NEXT_PUBLIC_NAMA_BKK_SINGKAT=BKK Balikpapan                       (opsional; bawaan: tanpa "Kelas ...")
//   NEXT_PUBLIC_NAMA_RESMI_BKK=Balai Kekarantinaan Kesehatan Kelas I Balikpapan   (opsional; bawaan: dari nama BKK)
// Catatan: variabel NEXT_PUBLIC_* ditanam saat build, jadi perubahan baru berlaku setelah build ulang.
// Variabel lama NAMA_BKK / NAMA_BKK_SINGKAT tetap dibaca di sisi server sebagai cadangan.
// Bawaan bila tidak diisi: BKK Kelas I Samarinda.

const bersih = (v: string | undefined): string | undefined => v?.trim() || undefined;

// Akses harus berupa process.env.NAMA_PERSIS (bukan process.env[nama]) agar Next.js dapat menanamnya ke bundel browser.
export const NAMA_BKK: string =
  bersih(process.env.NEXT_PUBLIC_NAMA_BKK) ?? bersih(process.env.NAMA_BKK) ?? 'BKK Kelas I Samarinda';

export const NAMA_BKK_SINGKAT: string =
  bersih(process.env.NEXT_PUBLIC_NAMA_BKK_SINGKAT) ??
  bersih(process.env.NAMA_BKK_SINGKAT) ??
  NAMA_BKK.replace(/\s+Kelas\s+[IVX]+\b/i, '');

export const NAMA_RESMI_BKK: string =
  bersih(process.env.NEXT_PUBLIC_NAMA_RESMI_BKK) ?? NAMA_BKK.replace(/^BKK\b/, 'Balai Kekarantinaan Kesehatan');

/** "Kelas I Samarinda" (nama BKK tanpa awalan "BKK"), untuk kalimat yang menyusun "<kategori> Kelas I Samarinda". */
export const NAMA_BKK_TANPA_AWALAN: string = NAMA_BKK.replace(/^BKK\s+/i, '');

/** Kota kedudukan BKK ("Samarinda"): bagian terakhir setelah "BKK Kelas X"; dipakai di tanda tangan laporan dan teks naratif. */
export const NAMA_KOTA_BKK: string =
  bersih(process.env.NEXT_PUBLIC_NAMA_KOTA_BKK) ?? NAMA_BKK.replace(/^BKK\s+(Kelas\s+[IVX]+\s+)?/i, '');

/** Provinsi tempat BKK berada; dipakai di teks naratif analisis AI. Bawaan: Kalimantan Timur. */
export const NAMA_PROVINSI_BKK: string = bersih(process.env.NEXT_PUBLIC_NAMA_PROVINSI_BKK) ?? 'Kalimantan Timur';

/** "Balai Kekarantinaan Kesehatan (BKK) Kelas I Samarinda": bentuk dengan singkatan dalam kurung, untuk prompt AI. */
export const NAMA_RESMI_BKK_KURUNG: string = NAMA_BKK.replace(/^BKK\b/, 'Balai Kekarantinaan Kesehatan (BKK)');
