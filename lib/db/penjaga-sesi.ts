// lib/db/penjaga-sesi.ts
// Identitas pengguna untuk tiruan RLS berasal dari sesi MariaDB (cookie epic_sesi, lib/auth/session.ts).
// Dipakai oleh lib/db/server.ts (klien atas nama pengguna) dan app/api/db/route.ts (jalur data browser).
import { buatPenjaga } from './rls';
import type { KonteksAuth, Penjaga } from './rls';

/** Pengguna dari sesi MariaDB (bentuk minimal yang dibutuhkan penjaga RLS). */
export type AmbilPengguna = () => Promise<{ id: string; role: string } | null>;

/**
 * Penjaga RLS untuk satu permintaan: identitas dan role dari sesi MariaDB (`getPengguna`).
 * `getPengguna` hanya mengembalikan akun berstatus approved dengan sesi yang belum kedaluwarsa/tidak aktif,
 * jadi akun pending atau sesi mati diperlakukan sebagai anonim (aman: gagal tertutup).
 * `ambilPengguna` bisa disuntik untuk pengujian.
 */
export function buatPenjagaDariSesi(ambilPengguna?: AmbilPengguna): Penjaga {
  const ambilKonteks = async (): Promise<KonteksAuth> => {
    try {
      const baca: AmbilPengguna =
        ambilPengguna ?? (async () => (await import('@/lib/auth/session')).getPengguna());
      const p = await baca();
      return p ? { uid: p.id, role: p.role ?? null } : { uid: null, role: null };
    } catch (e) {
      console.error('[rls] gagal membaca sesi, diperlakukan sebagai anonim:', e);
      return { uid: null, role: null };
    }
  };
  return buatPenjaga(ambilKonteks);
}
