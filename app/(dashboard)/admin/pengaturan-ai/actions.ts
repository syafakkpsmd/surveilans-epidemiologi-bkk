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
 *
 * CATATAN: sejak fitur fallback multi-provider ditambahkan, BOLEH ada
 * lebih dari satu provider aktif=true sekaligus. route.ts akan mencoba
 * semua provider aktif berurutan sesuai urutan_prioritas (angka kecil
 * dicoba duluan) sampai salah satu berhasil.
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

function ambilUrutanPrioritas(formData: FormData): number {
  const nilai = parseInt(ambilString(formData, 'urutan_prioritas'), 10);
  return Number.isFinite(nilai) && nilai > 0 ? nilai : 1;
}

export async function tambahProvider(formData: FormData): Promise<void> {
  await pastikanAdmin();

  const nama_tampilan = ambilString(formData, 'nama_tampilan');
  const tipe_provider = ambilString(formData, 'tipe_provider') as TipeProviderAi;
  const base_url = ambilString(formData, 'base_url') || null;
  const model = ambilString(formData, 'model');
  const api_key = ambilString(formData, 'api_key');
  const aktif = formData.get('aktif') === 'on';
  const urutan_prioritas = ambilUrutanPrioritas(formData);

  if (!nama_tampilan || !model || !api_key) {
    throw new Error('Nama tampilan, model, dan API key wajib diisi untuk provider baru.');
  }
  if (tipe_provider !== 'gemini' && tipe_provider !== 'openai_compatible') {
    throw new Error('Tipe provider tidak valid.');
  }

  const supabase = createServiceRoleClient();

  // Memisahkan objek payload dan melabelinya dengan `as any`
  // agar tidak terbentur masalah tipe 'never' dari definisi Supabase
  const payloadData = {
    nama_tampilan,
    tipe_provider,
    base_url,
    model,
    api_key,
    aktif,
    urutan_prioritas,
  };

  const { error } = await supabase
    .from('pengaturan_ai')
    .insert(payloadData as any);

  if (error) {
    throw new Error(`Gagal menyimpan provider baru: ${error.message}`);
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
  const urutan_prioritas = ambilUrutanPrioritas(formData);

  if (!nama_tampilan || !model) {
    throw new Error('Nama tampilan dan model wajib diisi.');
  }
  if (tipe_provider !== 'gemini' && tipe_provider !== 'openai_compatible') {
    throw new Error('Tipe provider tidak valid.');
  }

  const supabase = createServiceRoleClient();

  // api_key WRITE-ONLY: kosongkan field di form = "tidak diganti".
  // Hanya update kolom api_key kalau admin benar-benar mengisi ulang.
  const dataUpdate: Record<string, any> = {
    nama_tampilan,
    tipe_provider,
    base_url,
    model,
    aktif,
    urutan_prioritas,
  };
  
  if (api_key_baru) {
    dataUpdate.api_key = api_key_baru;
  }

  const { error } = await supabase
    .from('pengaturan_ai')
    .update(dataUpdate as any)
    .eq('id', id);

  if (error) {
    throw new Error(`Gagal memperbarui provider: ${error.message}`);
  }

  revalidatePath('/admin/pengaturan-ai');
}

export async function hapusProvider(id: number): Promise<void> {
  await pastikanAdmin();

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('pengaturan_ai')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus provider: ${error.message}`);
  }

  revalidatePath('/admin/pengaturan-ai');
}