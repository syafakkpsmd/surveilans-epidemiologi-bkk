// lib/db/rls.ts
// Pengganti RLS Supabase pada masa peralihan (Supabase Auth masih dipakai untuk login, data di MariaDB).
// Aturan dibangkitkan dari 103 policy RLS asli (lib/db/rls-policy.generated.ts, hasil scripts/migrate/buat-rls.mjs).
//
// Cara kerja (meniru Postgres):
//   * Pengguna belum login = role 'anon'; sudah login = 'authenticated'. Policy hanya berlaku untuk role yang
//     disebut ('public' = keduanya). Policy bersifat permissive: salah satu yang lolos sudah cukup (OR).
//   * Tabel BASE tanpa policy sama sekali = RLS aktif tanpa policy = DITOLAK (mis. pengaturan_ai berisi api_key).
//     View tidak diperiksa (di Supabase view berjalan dengan hak pemilik).
//   * SELECT ditolak -> hasil kosong; UPDATE/DELETE ditolak -> tidak ada baris terpengaruh (tanpa galat);
//     INSERT ditolak -> galat 42501, sama seperti PostgREST.
// Klien service-role melewati semua aturan ini (sama seperti Supabase).
import { POLICY_RLS } from './rls-policy.generated';
import type { PerintahRls } from './rls-policy.generated';

export type { PerintahRls };

export interface KonteksAuth {
  uid: string | null; // auth.uid()
  role: string | null; // profiles.role: 'admin' | 'petugas' | 'petugas_klinik' | ...
}

export type Keputusan = { izin: 'bebas' } | { izin: 'tolak' } | { izin: 'baris'; kolom: string; nilai: string };

export type Penjaga = (tabel: string, cmd: PerintahRls) => Promise<Keputusan>;

/** Keputusan murni (tanpa I/O); mudah diuji. `adalahView` = tidak diperiksa. */
export function putuskan(tabel: string, cmd: PerintahRls, ctx: KonteksAuth, adalahView = false): Keputusan {
  if (adalahView) return { izin: 'bebas' };
  const roleDb = ctx.uid ? 'authenticated' : 'anon';
  const daftar = (POLICY_RLS[tabel]?.[cmd] ?? []).filter((a) => a.untuk.includes('public') || a.untuk.includes(roleDb));
  let skopDiri = false;
  for (const a of daftar) {
    switch (a.t) {
      case 'semua':
        return { izin: 'bebas' };
      case 'login':
        if (ctx.uid) return { izin: 'bebas' };
        break;
      case 'admin':
        if (ctx.uid && ctx.role === 'admin') return { izin: 'bebas' };
        break;
      case 'role':
        if (ctx.uid && ctx.role && a.roles.includes(ctx.role)) return { izin: 'bebas' };
        break;
      case 'diri_atau_admin':
        if (ctx.uid && ctx.role === 'admin') return { izin: 'bebas' };
        if (ctx.uid) skopDiri = true;
        break;
      case 'diri':
        if (ctx.uid) skopDiri = true;
        break;
      default:
        break; // 'tolak'
    }
  }
  if (skopDiri && ctx.uid) return { izin: 'baris', kolom: 'id', nilai: ctx.uid };
  return { izin: 'tolak' };
}

/** Penjaga untuk satu permintaan: konteks (uid + role) diambil sekali, keputusan di-cache per tabel+perintah. */
export function buatPenjaga(ambilKonteks: () => Promise<KonteksAuth>): Penjaga {
  let konteks: Promise<KonteksAuth> | null = null;
  const cache = new Map<string, Keputusan>();
  return async (tabel, cmd) => {
    const kunci = `${tabel}|${cmd}`;
    const ada = cache.get(kunci);
    if (ada) return ada;
    konteks ??= ambilKonteks();
    const k = putuskan(tabel, cmd, await konteks);
    cache.set(kunci, k);
    return k;
  };
}
