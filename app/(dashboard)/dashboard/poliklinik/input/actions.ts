'use server';

import { revalidatePath } from 'next/cache';
import { ambilIcd } from '@/lib/db/modul/icd';
import { validasiKunjungan } from '@/lib/db/modul/poliklinikNonBkk';
import { getNamaWilkerModul } from '@/lib/wilayah-kerja/server';
import {
  cekAksesBkk, tambahKunjunganBkk, ubahKunjunganBkk, hapusKunjunganBkkDb,
} from '@/lib/db/modul/poliklinikBkk';

export type HasilKunjungan = { sukses: true; pesan: string } | { sukses: false; error: string };

const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });

export async function simpanKunjunganBkk(formData: FormData): Promise<HasilKunjungan> {
  const { user, boleh, admin } = await cekAksesBkk();
  if (!user || !boleh) return { sukses: false, error: 'Tidak diizinkan.' };

  const wilker = String(formData.get('wilayah_kerja') ?? '');
  if (!(await getNamaWilkerModul('poliklinik')).includes(wilker)) return { sukses: false, error: 'Pilih wilayah kerja.' };

  const v = validasiKunjungan(formData, hariIni());
  if ('error' in v) return { sukses: false, error: v.error };

  try {
    const icd = await ambilIcd(v.data.kodeDiagnosa);
    if (!icd) return { sukses: false, error: 'Kode ICD-10 tidak ditemukan. Pilih dari daftar.' };

    const idEdit = String(formData.get('id') ?? '').trim();
    if (idEdit) {
      if (!/^\d+$/.test(idEdit)) return { sukses: false, error: 'Data tidak valid.' };
      const ok = await ubahKunjunganBkk(idEdit, user.id, admin, wilker, v.data, icd.nama);
      if (!ok) return { sukses: false, error: 'Data tidak ditemukan atau bukan milik Anda.' };
    } else {
      await tambahKunjunganBkk(wilker, v.data, icd.nama, user.id);
    }
    revalidatePath('/dashboard/poliklinik');
    revalidatePath('/dashboard/poliklinik/input');
    return { sukses: true, pesan: idEdit ? 'Data diperbarui.' : 'Kunjungan tersimpan.' };
  } catch (e: any) {
    console.error('[simpanKunjunganBkk]', e?.message);
    return { sukses: false, error: 'Gagal menyimpan data. Coba lagi.' };
  }
}

export async function hapusKunjunganBkk(id: string): Promise<HasilKunjungan> {
  const { user, boleh, admin } = await cekAksesBkk();
  if (!user || !boleh) return { sukses: false, error: 'Tidak diizinkan.' };
  if (!/^\d+$/.test(id)) return { sukses: false, error: 'Data tidak valid.' };
  try {
    const ok = await hapusKunjunganBkkDb(id, user.id, admin);
    if (!ok) return { sukses: false, error: 'Data tidak ditemukan atau bukan milik Anda.' };
    revalidatePath('/dashboard/poliklinik');
    revalidatePath('/dashboard/poliklinik/input');
    return { sukses: true, pesan: 'Data dihapus.' };
  } catch (e: any) {
    console.error('[hapusKunjunganBkk]', e?.message);
    return { sukses: false, error: 'Gagal menghapus data.' };
  }
}