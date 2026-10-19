// lib/auth/aksesPosko.ts
import type { PeranUser } from '@/types/database.types';

/** Melihat dashboard & info grafis Posko: publik (tanpa login). */
export function bolehLihatPosko(): boolean {
  return true;
}

/**
 * Mengatur periode posko & menginput data harian (penyakit, KLB, PTM) lewat aplikasi:
 * Admin, Petugas, atau Petugas Klinik. Ubah di sini bila hak aksesnya ingin diganti.
 */
export function bolehKelolaPosko(role: PeranUser | null): boolean {
  return role === 'admin' || role === 'petugas' || role === 'petugas_klinik';
}
