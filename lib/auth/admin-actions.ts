'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth/get-user-role'; // sesuaikan path file getUserRole yang sudah ada
import { revalidatePath } from 'next/cache';

async function assertAdmin() {
  const role = await getUserRole();
  if (role !== 'admin') {
    throw new Error('Tidak diizinkan: hanya Admin.');
  }
}

export async function approveUser(userId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'approved' })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}

export async function suspendUser(userId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}

export async function deleteUser(userId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  // baris di public.profiles idealnya di-cascade lewat FK on delete cascade
  // ke auth.users; kalau belum, hapus manual di sini juga.
  revalidatePath('/admin/users');
}
export async function updateUserNama(userId: string, nama: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ nama_lengkap: nama })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}