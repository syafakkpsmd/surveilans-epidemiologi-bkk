/**
 * SERVER-ONLY. Kembalian:
 *   'tamu'           -- belum login, atau akun tidak aktif/tidak punya profil valid
 *   'admin' | 'petugas' | 'petugas_klinik' | 'poliklinik' | 'klinik_binaan'
 *                    -- sesuai profiles.role (akun approved)
 *
 * Catatan peran:
 *   'petugas_klinik' = Petugas Klinik (petugas BKK; boleh melihat tabel Klinik).
 *   'poliklinik'     = Poliklinik (modul klinik non-BKK; dashboard menyusul).
 *   'klinik_binaan'  = petugas klinik binaan; hanya mengentri & melihat data kliniknya sendiri,
 *                      diarahkan ke dashboard klinik binaan sesuai kode klinik yang tertaut.
 * Aturan akses AI: lib/auth/aksesAI.ts; Tabel Klinik: lib/auth/aksesKlinik.ts;
 * kelola akun: khusus 'admin'.
 */
import { cache } from 'react';
import { getPengguna } from '@/lib/auth/session';

export type PeranAkses =
  | 'admin'
  | 'petugas'
  | 'tamu'
  | 'petugas_klinik'
  | 'poliklinik'
  | 'klinik_binaan';

/** Role yang bisa tersimpan di profiles.role (semua kecuali 'tamu'). */
const ROLE_TERSIMPAN = ['admin', 'petugas', 'petugas_klinik', 'poliklinik', 'klinik_binaan'] as const;
type PeranTersimpan = (typeof ROLE_TERSIMPAN)[number];

/** Label tampilan untuk UI (admin pengguna, header, dsb). */
export const LABEL_PERAN: Record<PeranAkses, string> = {
  admin: 'Admin',
  petugas: 'Petugas',
  petugas_klinik: 'Petugas Klinik',
  poliklinik: 'Poliklinik',
  klinik_binaan: 'Klinik Binaan',
  tamu: 'Tamu',
};

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