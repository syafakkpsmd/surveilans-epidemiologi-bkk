// lib/db/hybrid.ts
// Tahap 4b/5b: DATA dibaca/ditulis ke MariaDB; identitas pengguna untuk tiruan RLS berasal dari
// sesi MariaDB (cookie epic_sesi, lib/auth/session.ts), BUKAN lagi dari Supabase Auth.
// Dipakai lewat lib/supabase/server.ts dan lib/supabase/serviceRole.ts, jadi file pemanggil TIDAK berubah.
//
// Saklar: DATA_BACKEND=mariadb (di .env.local). Tanpa itu (atau 'supabase') perilaku lama tidak berubah.
// Klien pengguna (createClient) memakai pengganti RLS (lib/db/rls.ts); klien service-role melewati RLS.
import { dbFrom, dbRpc } from './query-builder';
import { buatPenjaga } from './rls';
import type { KonteksAuth, Penjaga } from './rls';

export function dataDiMariaDb(): boolean {
  return process.env.DATA_BACKEND === 'mariadb';
}

/** Pengguna dari sesi MariaDB (bentuk minimal yang dibutuhkan penjaga RLS). */
export type AmbilPengguna = () => Promise<{ id: string; role: string } | null>;

/** Bungkus klien Supabase: `.from()` dan `.rpc()` dialihkan ke MariaDB; `.auth` dan lainnya tetap Supabase. */
function bungkus<T extends object>(klien: T, penjaga?: Penjaga): T {
  return new Proxy(klien, {
    get(target, prop, receiver) {
      if (prop === 'from') return (tabel: string) => dbFrom(tabel, penjaga);
      if (prop === 'rpc') return dbRpc;
      const nilai = Reflect.get(target, prop, receiver);
      return typeof nilai === 'function' ? nilai.bind(target) : nilai;
    },
  });
}

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

/** Klien atas nama pengguna yang sedang login (atau anon): RLS ditiru di server. */
export function pakaiMariaDbUntukPengguna<T extends object>(klien: T): T {
  if (!dataDiMariaDb()) return klien;
  return bungkus(klien, buatPenjagaDariSesi());
}

/** Klien service-role: melewati RLS (sama seperti di Supabase). */
export function pakaiMariaDbTanpaRls<T extends object>(klien: T): T {
  return dataDiMariaDb() ? bungkus(klien) : klien;
}
