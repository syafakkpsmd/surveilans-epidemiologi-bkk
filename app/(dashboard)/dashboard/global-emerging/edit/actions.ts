'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import {
  validasiGlobal, adaKembaran, ubahBarisGlobal, hapusBarisGlobal, nilaiLamaBaris, penyakitSah, negaraSah,
} from '@/lib/db/modul/globalEmergingEdit';

export type HasilEdit = { sukses: true; pesan: string } | { sukses: false; error: string };

async function boleh() {
  const role = await getUserRole();
  return role === 'petugas' || role === 'admin';
}

export async function simpanEditGlobal(formData: FormData): Promise<HasilEdit> {
  if (!(await boleh())) return { sukses: false, error: 'Tidak diizinkan.' };
  const id = String(formData.get('id') ?? '');
  if (!/^\d+$/.test(id)) return { sukses: false, error: 'Data tidak valid.' };

  const v = validasiGlobal(formData);
  if ('error' in v) return { sukses: false, error: v.error };

  try {
    const lama = await nilaiLamaBaris(id);
    if (!lama) return { sukses: false, error: 'Data tidak ditemukan.' };
    // nilai baru harus ada di daftar; nilai lama boleh dipertahankan (data warisan)
    if (!penyakitSah(v.data.penyakit) && v.data.penyakit !== lama.penyakit) return { sukses: false, error: 'Penyakit tidak valid.' };
    if (!negaraSah(v.data.negara) && v.data.negara !== lama.negara) return { sukses: false, error: 'Negara tidak valid.' };

    if (await adaKembaran(id, v.data)) {
      return { sukses: false, error: 'Sudah ada data lain dengan penyakit, negara, periode, dan sumber yang sama. Edit data itu, atau ubah isian Sumber.' };
    }
    if (!(await ubahBarisGlobal(id, v.data))) return { sukses: false, error: 'Data tidak ditemukan.' };
    revalidatePath('/dashboard/global-emerging');
    revalidatePath('/dashboard/global-emerging/edit');
    return { sukses: true, pesan: 'Data diperbarui.' };
  } catch (e: any) {
    if (e?.code === '23505') {
      return { sukses: false, error: 'Sudah ada data lain dengan penyakit, negara, periode, dan sumber yang sama.' };
    }
    console.error('[simpanEditGlobal]', e?.message);
    return { sukses: false, error: 'Gagal menyimpan perubahan.' };
  }
}

export async function hapusDataGlobal(id: string): Promise<HasilEdit> {
  if (!(await boleh())) return { sukses: false, error: 'Tidak diizinkan.' };
  if (!/^\d+$/.test(id)) return { sukses: false, error: 'Data tidak valid.' };
  try {
    if (!(await hapusBarisGlobal(id))) return { sukses: false, error: 'Data tidak ditemukan.' };
    revalidatePath('/dashboard/global-emerging');
    revalidatePath('/dashboard/global-emerging/edit');
    return { sukses: true, pesan: 'Data dihapus.' };
  } catch (e: any) {
    console.error('[hapusDataGlobal]', e?.message);
    return { sukses: false, error: 'Gagal menghapus data.' };
  }
}