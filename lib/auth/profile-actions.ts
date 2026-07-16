'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateNamaLengkap(formData: FormData) {
  const nama = String(formData.get('nama_lengkap') ?? '').trim();

  if (!nama) {
    return { ok: false, error: 'Nama tidak boleh kosong.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Anda belum login.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ nama_lengkap: nama })
    .eq('id', user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard/profil');
  return { ok: true };
}