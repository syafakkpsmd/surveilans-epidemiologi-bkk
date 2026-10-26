/**
 * SERVER-ONLY. Kembalian:
 *   'tamu'           -- belum login, atau akun tidak aktif/tidak punya profil valid
 *   'petugas' | 'petugas_klinik' | 'admin' -- sesuai profiles.role (akun approved)
 * Aturan akses AI: lib/auth/aksesAI.ts; Tabel Klinik: lib/auth/aksesKlinik.ts;
 * kelola akun: khusus 'admin'.
 */
import { cache } from 'react';
import { getPengguna } from '@/lib/auth/session';

export type PeranAkses = 'admin' | 'petugas' | 'tamu' | 'petugas_klinik';

/** Role yang bisa tersimpan di profiles.role (semua kecuali 'tamu'). */
const ROLE_TERSIMPAN = ['admin', 'petugas', 'petugas_klinik'] as const;
type PeranTersimpan = (typeof ROLE_TERSIMPAN)[number];

function adalahPeranTersimpan(nilai: unknown): nilai is PeranTersimpan {
  return typeof nilai === 'string' && (ROLE_TERSIMPAN as readonly string[]).includes(nilai);
}

export const getUserRole = cache(async (): Promise<PeranAkses> => {
  const p = await getPengguna();
  if (!p) return 'tamu';
  if (!adalahPeranTersimpan(p.role)) {
    console.warn(`User ${p.id} punya nilai role tidak dikenal ("${String(p.role)}") di tabel profiles -- diperlakukan sebagai 'tamu'.`);
    return 'tamu';
  }
  return p.role;
});
