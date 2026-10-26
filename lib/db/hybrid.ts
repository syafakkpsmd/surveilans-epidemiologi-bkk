// lib/db/hybrid.ts
// Masa peralihan (Tahap 4b): login tetap Supabase Auth, DATA dibaca/ditulis ke MariaDB.
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

interface PunyaAuth {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
}

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

/** Penjaga RLS untuk satu permintaan: identitas dari sesi Supabase Auth, role dari profiles (MariaDB). */
export function buatPenjagaDariKlien(klien: PunyaAuth): Penjaga {
  const ambilKonteks = async (): Promise<KonteksAuth> => {
    const { data } = await klien.auth.getUser();
    const uid = data.user?.id ?? null;
    if (!uid) return { uid: null, role: null };
    // profiles dibaca TANPA penjaga (mencari role pengguna itu sendiri).
    const r = await dbFrom('profiles').select('role').eq('id', uid).maybeSingle();
    return { uid, role: (r.data?.role as string | undefined) ?? null };
  };
  return buatPenjaga(ambilKonteks);
}

/** Klien atas nama pengguna yang sedang login (atau anon): RLS ditiru di server. */
export function pakaiMariaDbUntukPengguna<T extends object & PunyaAuth>(klien: T): T {
  if (!dataDiMariaDb()) return klien;
  return bungkus(klien, buatPenjagaDariKlien(klien));
}

/** Klien service-role: melewati RLS (sama seperti di Supabase). */
export function pakaiMariaDbTanpaRls<T extends object>(klien: T): T {
  return dataDiMariaDb() ? bungkus(klien) : klien;
}
