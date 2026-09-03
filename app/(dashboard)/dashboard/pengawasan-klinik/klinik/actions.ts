// app/(dashboard)/dashboard/pengawasan-klinik/klinik/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { revalidatePath } from 'next/cache';

type HasilAksi = { error?: string; success?: boolean };

async function pastikanAdmin(): Promise<HasilAksi | null> {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || role !== 'admin') {
    return { error: 'Hanya admin yang dapat mengelola data master klinik.' };
  }
  return null;
}

function getString(formData: FormData, key: string): string | null {
  const val = formData.get(key);
  return typeof val === 'string' && val.length > 0 ? val : null;
}

function getNumber(formData: FormData, key: string): number | null {
  const val = formData.get(key);
  if (typeof val !== 'string' || val.trim() === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

// nama_klinik dipisah sebagai string wajib, sisanya boleh null
function bangunPayload(formData: FormData, namaKlinik: string) {
  return {
    nama_klinik: namaKlinik,
    alamat_klinik: getString(formData, 'alamat_klinik'),
    jenis_fasilitas: getString(formData, 'jenis_fasilitas'),
    kabupaten_kota: getString(formData, 'kabupaten_kota'),
    telepon: getString(formData, 'telepon'),
    pemilik_pimpinan: getString(formData, 'pemilik_pimpinan'),
    penanggung_jawab: getString(formData, 'penanggung_jawab'),
    latitude: getNumber(formData, 'latitude'),
    longitude: getNumber(formData, 'longitude'),
  };
}

export async function tambahKlinikBaru(formData: FormData): Promise<HasilAksi> {
  const gate = await pastikanAdmin();
  if (gate) return gate;

  const namaKlinik = getString(formData, 'nama_klinik');
  if (!namaKlinik) return { error: 'Nama klinik wajib diisi.' };

  const payload = bangunPayload(formData, namaKlinik);

  const supabase = await createClient();
  const { error } = await supabase.from('klinik_binaan').insert(payload);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pengawasan-klinik/klinik');
  return { success: true };
}

export async function updateKlinik(id: string, formData: FormData): Promise<HasilAksi> {
  const gate = await pastikanAdmin();
  if (gate) return gate;

  const namaKlinik = getString(formData, 'nama_klinik');
  if (!namaKlinik) return { error: 'Nama klinik wajib diisi.' };

  const payload = bangunPayload(formData, namaKlinik);

  const supabase = await createClient();
  const { error } = await supabase.from('klinik_binaan').update(payload).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pengawasan-klinik/klinik');
  return { success: true };
}

export async function hapusKlinik(id: string): Promise<HasilAksi> {
  const gate = await pastikanAdmin();
  if (gate) return gate;

  const supabase = await createClient();
  const { error } = await supabase.from('klinik_binaan').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/pengawasan-klinik/klinik');
  return { success: true };
}