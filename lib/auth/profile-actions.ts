'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/auth/db';
import { getPengguna } from '@/lib/auth/session';

export async function updateNamaLengkap(formData: FormData) {
  const nama = String(formData.get('nama_lengkap') ?? '').trim();

  if (!nama) {
    return { ok: false, error: 'Nama tidak boleh kosong.' };
  }

  const user = await getPengguna();
  if (!user) {
    return { ok: false, error: 'Anda belum login.' };
  }

  try {
    await sql(`UPDATE profiles SET nama_lengkap = ? WHERE id = ?`, [nama, user.id]);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Gagal menyimpan.' };
  }

  revalidatePath('/dashboard/profil');
  return { ok: true };
}