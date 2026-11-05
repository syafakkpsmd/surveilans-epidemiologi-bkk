'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getDaftarPenyakit, getDaftarPropinsi, hapusBarisEmerging } from '@/lib/db/modul/nasionalEmerging';

export type HasilHapus = { ok: true } | { ok: false; error: string };

export async function hapusDataEmerging(
  penyakit: string, propinsi: string, tahun: number, minggu: number
): Promise<HasilHapus> {
  const role = await getUserRole();
  if (role !== 'petugas' && role !== 'admin') return { ok: false, error: 'Tidak diizinkan.' };
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2100) return { ok: false, error: 'Tahun tidak valid.' };
  if (!Number.isInteger(minggu) || minggu < 1 || minggu > 53) return { ok: false, error: 'Minggu tidak valid.' };

  try {
    const [daftarPenyakit, daftarPropinsi] = await Promise.all([getDaftarPenyakit(), getDaftarPropinsi()]);
    if (!daftarPenyakit.includes(penyakit) || !daftarPropinsi.includes(propinsi)) {
      return { ok: false, error: 'Data tidak valid.' };
    }
    const ada = await hapusBarisEmerging(penyakit, propinsi, tahun, minggu);
    if (!ada) return { ok: false, error: 'Data tidak ditemukan.' };
    revalidatePath('/dashboard/nasional-emerging');
    return { ok: true };
  } catch (e: any) {
    console.error('[hapusDataEmerging]', e?.message);
    return { ok: false, error: 'Gagal menghapus data.' };
  }
}