'use server';

import { getUserRole } from '@/lib/auth/get-user-role';
import { cariIcd, type IcdHit } from '@/lib/db/modul/icd';

export type { IcdHit };
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function searchIcd(query: string): Promise<ActionResult<IcdHit[]>> {
  const role = await getUserRole();
  if (role === 'tamu') return { ok: false, error: 'Akses ditolak.' };
  const q = String(query ?? '').trim();
  if (q.length < 2 || q.length > 80) return { ok: true, data: [] };
  try {
    return { ok: true, data: await cariIcd(q) };
  } catch (e) {
    console.error('[searchIcd]', e instanceof Error ? e.message : e);
    return { ok: false, error: 'Pencarian ICD-10 gagal.' };
  }
}