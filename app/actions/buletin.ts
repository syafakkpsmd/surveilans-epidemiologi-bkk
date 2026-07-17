'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function ambilStringWajib(formData: FormData, key: string): string {
  const nilai = formData.get(key);
  if (typeof nilai !== 'string' || nilai.trim() === '') {
    throw new Error(`Field "${key}" wajib diisi.`);
  }
  return nilai;
}

export async function tambahBuletin(formData: FormData) {
  const supabase = await createClient();

  const data = {
    tahun: parseInt(formData.get('tahun') as string),
    nama_kegiatan: ambilStringWajib(formData, 'nama_kegiatan'),
    tipe_link: ambilStringWajib(formData, 'tipe_link'),
    link_url: ambilStringWajib(formData, 'link_url'),
  };

  const { error } = await supabase.from('buletin').insert([data]);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/buletin');
}

export async function editBuletin(id: string, formData: FormData) {
  const supabase = await createClient();

  const data = {
    tahun: parseInt(formData.get('tahun') as string),
    nama_kegiatan: ambilStringWajib(formData, 'nama_kegiatan'),
    tipe_link: ambilStringWajib(formData, 'tipe_link'),
    link_url: ambilStringWajib(formData, 'link_url'),
  };

  const { error } = await supabase.from('buletin').update(data).eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/buletin');
}