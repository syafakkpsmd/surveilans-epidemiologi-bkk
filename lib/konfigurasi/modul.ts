// lib/konfigurasi/modul.ts
// Modul yang hanya relevan untuk BKK Samarinda (jadwal APT Pranoto, karhutla/hotspot Kalimantan Timur).
// BKK lain menyembunyikannya dengan: NEXT_PUBLIC_SEMBUNYIKAN_MODUL_SAMARINDA=true (lalu build ulang).
export const MODUL_KHUSUS_SAMARINDA_TAMPIL: boolean =
  process.env.NEXT_PUBLIC_SEMBUNYIKAN_MODUL_SAMARINDA?.trim().toLowerCase() !== 'true';

/** Alamat halaman yang disembunyikan untuk BKK lain. */
const HALAMAN_KHUSUS_SAMARINDA = [
  '/dashboard/alat-angkut/pesawat',
  '/dashboard/karhutla',
  '/dashboard/simulasi-wabah/pesawat',
];

export function bolehTampil(href: string): boolean {
  if (MODUL_KHUSUS_SAMARINDA_TAMPIL) return true;
  return !HALAMAN_KHUSUS_SAMARINDA.some((h) => href === h || href.startsWith(h + '/'));
}