// lib/db/server.ts  (SERVER: Server Component, Server Action, Route Handler)
// Klien data atas nama pengguna yang sedang login (atau anonim). RLS ditiru di server (lib/db/rls.ts) dengan
// identitas dari sesi MariaDB (cookie epic_sesi, lib/auth/session.ts).
//
// JANGAN dipakai di Client Component ('use client'): pakai createDbBrowserClient dari lib/db/browser-client.ts.
// Untuk operasi sistem yang melewati RLS, pakai createDbServiceClient dari lib/db/serviceRole.ts.
import { buatKlienDb } from './query-builder';
import { buatPenjagaDariSesi } from './penjaga-sesi';
import type { DbKlien } from './tipe';

export async function createDbClient(): Promise<DbKlien> {
  return buatKlienDb(buatPenjagaDariSesi()) as unknown as DbKlien;
}
