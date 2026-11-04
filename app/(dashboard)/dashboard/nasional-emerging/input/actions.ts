'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import {
  getDaftarPenyakit, getDaftarPropinsi, simpanEmerging, tambahPenyakit, validasiInputEmerging,
} from '@/lib/db/modul/nasionalEmerging';

export type HasilSimpanEmerging = { sukses: true; pesan: string } | { sukses: false; error: string };

async function wajibPetugas() {
  const role = await getUserRole();
  return role === 'petugas' || role === 'admin';
}

export async function simpanInputEmerging(formData: FormData): Promise<HasilSimpanEmerging> {
  if (!(await wajibPetugas())) return { sukses: false, error: 'Tidak diizinkan.' };
  try {
    const [propinsi, penyakit] = await Promise.all([getDaftarPropinsi(), getDaftarPenyakit()]);
    const v = validasiInputEmerging(formData, propinsi, penyakit);
    if ('error' in v) return { sukses: false, error: v.error };
    const n = await simpanEmerging(v.data);
    revalidatePath('/dashboard/nasional-emerging');
    return { sukses: true, pesan: `Tersimpan: ${n} provinsi, ${v.data.penyakit}, minggu ${v.data.minggu} tahun ${v.data.tahun}.` };
  } catch (e: any) {
    console.error('[simpanInputEmerging]', e?.message);
    return { sukses: false, error: 'Gagal menyimpan data. Coba lagi.' };
  }
}

export async function aksiTambahPenyakit(
  nama: string
): Promise<{ ok: true; nama: string } | { ok: false; error: string }> {
  if (!(await wajibPetugas())) return { ok: false, error: 'Tidak diizinkan.' };
  const bersih = nama.replace(/\s+/g, ' ').trim();
  if (bersih.length < 3) return { ok: false, error: 'Nama penyakit terlalu pendek.' };
  if (bersih.length > 100) return { ok: false, error: 'Nama penyakit terlalu panjang.' };
  if (!/^[\p{L}\p{N} .,()\/-]+$/u.test(bersih)) return { ok: false, error: 'Nama mengandung karakter yang tidak diizinkan.' };
  try {
    const hasil = await tambahPenyakit(bersih);
    revalidatePath('/dashboard/nasional-emerging');
    return { ok: true, nama: hasil };
  } catch (e: any) {
    console.error('[aksiTambahPenyakit]', e?.message);
    return { ok: false, error: 'Gagal menambah penyakit.' };
  }
}