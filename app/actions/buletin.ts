'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function tambahBuletin(formData: FormData) {
  const supabase = await createClient();
  
  const data = {
    tahun: parseInt(formData.get('tahun') as string),
    nama_kegiatan: formData.get('nama_kegiatan'),
    tipe_link: formData.get('tipe_link'),
    link_url: formData.get('link_url'),
  };

  const { error } = await supabase.from('buletin').insert([data]);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/buletin');
}

export async function editBuletin(id: string, formData: FormData) {
  const supabase = await createClient();

  const data = {
    tahun: parseInt(formData.get('tahun') as string),
    nama_kegiatan: formData.get('nama_kegiatan'),
    tipe_link: formData.get('tipe_link'),
    link_url: formData.get('link_url'),
  };

  const { error } = await supabase.from('buletin').update(data).eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/buletin');
}
