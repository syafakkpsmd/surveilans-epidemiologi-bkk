// lib/media-tanah/auth.ts
// Level "staf" = admin, petugas, petugas_klinik berstatus approved (lib/auth/guard.ts).
import { getPengguna } from '@/lib/auth/session';
import { memenuhi } from '@/lib/auth/guard';

export type PenggunaTanah = { id: string; nama: string; role: string };

export async function requireStaf(): Promise<PenggunaTanah | null> {
  const u = await getPengguna();
  if (!u || !memenuhi(u, 'staf')) return null;
  return { id: u.id, nama: u.namaLengkap ?? u.email ?? 'petugas', role: u.role };
}