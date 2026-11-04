'use server';

import { revalidatePath } from 'next/cache';
import { ambilIcd } from '@/lib/db/modul/icd';
import {
  cekAkses, getPoliklinikById, validasiKunjungan, tambahKunjungan, ubahKunjungan, hapusKunjunganDb,
} from '@/lib/db/modul/poliklinikNonBkk';

export type HasilKunjungan = { sukses: true; pesan: string } | { sukses: false; error: string };

const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });

export async function simpanKunjungan(formData: FormData): Promise<HasilKunjungan> {
  const poliklinikId = String(formData.get('poliklinik_id') ?? '');
  const akses = await cekAkses(poliklinikId);
  if (!akses.user || !akses.kelola) return { sukses: false, error: 'Tidak diizinkan.' };

  const v = validasiKunjungan(formData, hariIni());
  if ('error' in v) return { sukses: false, error: v.error };

  try {
    const icd = await ambilIcd(v.data.kodeDiagnosa); // kode harus ada di daftar, nama diambil dari database
    if (!icd) return { sukses: false, error: 'Kode ICD-10 tidak ditemukan. Pilih dari daftar.' };

    const idEdit = String(formData.get('id') ?? '').trim();
    if (idEdit) {
      if (!/^\d+$/.test(idEdit)) return { sukses: false, error: 'Data tidak valid.' };
      const ok = await ubahKunjungan(poliklinikId, idEdit, v.data, icd.nama);
      if (!ok) return { sukses: false, error: 'Data tidak ditemukan atau bukan milik poliklinik ini.' };
    } else {
      const p = await getPoliklinikById(poliklinikId);
      if (!p || !p.aktif) return { sukses: false, error: 'Poliklinik tidak ditemukan.' };
      await tambahKunjungan(p, v.data, icd.nama, akses.user.id);
    }
    revalidatePath(`/dashboard/poliklinik-non-bkk/${poliklinikId}`);
    revalidatePath(`/dashboard/poliklinik-non-bkk/${poliklinikId}/input`);
    return { sukses: true, pesan: idEdit ? 'Data diperbarui.' : 'Kunjungan tersimpan.' };
  } catch (e: any) {
    console.error('[simpanKunjungan]', e?.message);
    return { sukses: false, error: e?.message?.includes('wilayah kerja') ? e.message : 'Gagal menyimpan data. Coba lagi.' };
  }
}

export async function hapusKunjungan(poliklinikId: string, id: string): Promise<HasilKunjungan> {
  const akses = await cekAkses(poliklinikId);
  if (!akses.user || !akses.kelola) return { sukses: false, error: 'Tidak diizinkan.' };
  if (!/^\d+$/.test(id)) return { sukses: false, error: 'Data tidak valid.' };
  try {
    const ok = await hapusKunjunganDb(poliklinikId, id);
    if (!ok) return { sukses: false, error: 'Data tidak ditemukan.' };
    revalidatePath(`/dashboard/poliklinik-non-bkk/${poliklinikId}`);
    revalidatePath(`/dashboard/poliklinik-non-bkk/${poliklinikId}/input`);
    return { sukses: true, pesan: 'Data dihapus.' };
  } catch (e: any) {
    console.error('[hapusKunjungan]', e?.message);
    return { sukses: false, error: 'Gagal menghapus data.' };
  }
}