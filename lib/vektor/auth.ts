// lib/vektor/auth.ts
import { getPengguna } from '@/lib/auth/session';
import { memenuhi } from '@/lib/auth/guard';

export type PenggunaVektor = { id: string; nama: string; role: string };

export async function requireVektor(): Promise<PenggunaVektor | null> {
  const u = await getPengguna();
  if (!u || !memenuhi(u, 'staf')) return null;
  if (u.role !== 'admin' && u.role !== 'petugas') return null;
  return { id: u.id, nama: u.namaLengkap ?? u.email ?? 'petugas', role: u.role };
}