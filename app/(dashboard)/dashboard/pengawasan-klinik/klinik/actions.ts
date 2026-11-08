// app/(dashboard)/dashboard/pengawasan-klinik/klinik/actions.ts
'use server';

import { createDbServiceClient } from '@/lib/db/serviceRole';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { revalidatePath } from 'next/cache';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

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
    spreadsheet_id: getString(formData, 'spreadsheet_id'),
    // Wilayah kerja BKK yang membawahi klinik ini (opsional; tabel wilker_ref).
    kode_wilker: getString(formData, 'kode_wilker'),
  };
}

/** Kode wilayah kerja harus dikenal di wilker_ref (wilayah nonaktif tetap boleh agar klinik lama bisa diedit). */
async function galatWilker(kode: string | null): Promise<string | null> {
  if (!kode) return null;
  return (await getKamusWilker()).isKode(kode) ? null : 'Wilayah kerja tidak valid.';
}

export async function tambahKlinikBaru(formData: FormData): Promise<HasilAksi> {
  const gate = await pastikanAdmin();
  if (gate) return gate;

  const namaKlinik = getString(formData, 'nama_klinik');
  if (!namaKlinik) return { error: 'Nama klinik wajib diisi.' };

  const payload = bangunPayload(formData, namaKlinik);
  const galat = await galatWilker(payload.kode_wilker);
  if (galat) return { error: galat };

  const supabase = createDbServiceClient();
  // `as never`: types/generated.types.ts belum memuat kolom kode_wilker (hasil migrasi 24); hapus setelah tipe diregenerasi.
  const { error } = await supabase.from('klinik_binaan').insert(payload as never);

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
  const galat = await galatWilker(payload.kode_wilker);
  if (galat) return { error: galat };

  const supabase = createDbServiceClient();
  const { error } = await supabase.from('klinik_binaan').update(payload as never).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pengawasan-klinik/klinik');
  return { success: true };
}

export async function hapusKlinik(id: string): Promise<HasilAksi> {
  const gate = await pastikanAdmin();
  if (gate) return gate;

  const supabase = createDbServiceClient();
  const { error } = await supabase.from('klinik_binaan').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/pengawasan-klinik/klinik');
  return { success: true };
}