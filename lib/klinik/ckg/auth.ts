// lib/klinik/ckg/auth.ts
// Memakai sesi dan guard yang sudah ada (lib/auth/session.ts, lib/auth/guard.ts).
// Level "staf" = admin, petugas, petugas_klinik dengan status approved, sama seperti aksesAI/aksesPosko.
import { getPengguna } from '@/lib/auth/session';
import { memenuhi } from '@/lib/auth/guard';

export type PenggunaCkg = { id: string; nama: string; role: string };

export async function requireCkg(): Promise<PenggunaCkg | null> {
  const u = await getPengguna();
  if (!u || !memenuhi(u, 'staf')) return null;
  return { id: u.id, nama: u.namaLengkap ?? u.email ?? 'petugas', role: u.role };
}