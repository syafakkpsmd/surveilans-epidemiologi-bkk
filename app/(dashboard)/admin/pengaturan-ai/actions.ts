'use server';

/**
 * SEMUA fungsi di sini WAJIB diverifikasi ulang role='admin' di server
 * -- JANGAN andalkan halaman yang memanggilnya sudah mengecek (defense
 * in depth, sesuai KRITERIA SELESAI Segmen 9: akses langsung ke
 * Server Action pun harus tetap tertolak untuk non-admin).
 *
 * Dipakai service-role client (BUKAN createClient() biasa) karena
 * `pengaturan_ai` sengaja tidak punya policy INSERT/UPDATE/DELETE
 * untuk role authenticated -- satu-satunya jalur tulis yang sah adalah
 * lewat sini, SETELAH verifikasi admin di kode aplikasi.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import type { PengaturanAi, TipeProviderAi } from '@/types/database.types';

async function pastikanAdmin(): Promise<void> {
  const role = await getUserRole();
  if (role !== 'admin') {
    redirect('/dashboard');
  }
}

function ambilString(formData: FormData, nama: string): string {
  return String(formData.get(nama) ?? '').trim();
}

/** Kalau aktif=true, non-aktifkan semua provider LAIN supaya hanya ada 1 provider aktif. */
async function pastikanHanyaSatuAktif(
  supabase: ReturnType<typeof createServiceRoleClient>,
  idYangAktif: number
): Promise<void> {
  const { error } = await supabase
    .from('pengaturan_ai')
    .update({ aktif: false })
    .neq('id', idYangAktif);

  if (error) {
    console.error('Gagal menonaktifkan provider lain:', error.message);
  }
}

export async function tambahProvider(formData: FormData): Promise<void> {
  await pastikanAdmin();

  const nama_tampilan = ambilString(formData, 'nama_tampilan');
  const tipe_provider = ambilString(formData, 'tipe_provider') as TipeProviderAi;
  const base_url = ambilString(formData, 'base_url') || null;
  const model = ambilString(formData, 'model');
  const api_key = ambilString(formData, 'api_key');
  const aktif = formData.get('aktif') === 'on';

  if (!nama_tampilan || !model || !api_key) {
    throw new Error('Nama tampilan, model, dan API key wajib diisi untuk provider baru.');
  }
  if (tipe_provider !== 'gemini' && tipe_provider !== 'openai_compatible') {
    throw new Error('Tipe provider tidak valid.');
  }

  const supabase = createServiceRoleClient();
  const { data: baru, error } = await supabase
    .from('pengaturan_ai')
    .insert({ nama_tampilan, tipe_provider, base_url, model, api_key, aktif })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan provider baru: ${error.message}`);
  }

  if (aktif && baru) {
    await pastikanHanyaSatuAktif(supabase, baru.id);
  }

  revalidatePath('/admin/pengaturan-ai');
}

export async function updateProvider(id: number, formData: FormData): Promise<void> {
  await pastikanAdmin();

  const nama_tampilan = ambilString(formData, 'nama_tampilan');
  const tipe_provider = ambilString(formData, 'tipe_provider') as TipeProviderAi;
  const base_url = ambilString(formData, 'base_url') || null;
  const model = ambilString(formData, 'model');
  const api_key_baru = ambilString(formData, 'api_key');
  const aktif = formData.get('aktif') === 'on';

  if (!nama_tampilan || !model) {
    throw new Error('Nama tampilan dan model wajib diisi.');
  }
  if (tipe_provider !== 'gemini' && tipe_provider !== 'openai_compatible') {
    throw new Error('Tipe provider tidak valid.');
  }

  const supabase = createServiceRoleClient();

  // api_key WRITE-ONLY: kosongkan field di form = "tidak diganti".
  // Hanya update kolom api_key kalau admin benar-benar mengisi ulang.
  const dataUpdate: Partial<Omit<PengaturanAi, 'id'>> = {
    nama_tampilan,
    tipe_provider,
    base_url,
    model,
    aktif,
  };
  if (api_key_baru) {
    dataUpdate.api_key = api_key_baru;
  }

  const { error } = await supabase.from('pengaturan_ai').update(dataUpdate).eq('id', id);

  if (error) {
    throw new Error(`Gagal memperbarui provider: ${error.message}`);
  }

  if (aktif) {
    await pastikanHanyaSatuAktif(supabase, id);
  }

  revalidatePath('/admin/pengaturan-ai');
}

export async function hapusProvider(id: number): Promise<void> {
  await pastikanAdmin();

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('pengaturan_ai').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus provider: ${error.message}`);
  }

  revalidatePath('/admin/pengaturan-ai');
}
