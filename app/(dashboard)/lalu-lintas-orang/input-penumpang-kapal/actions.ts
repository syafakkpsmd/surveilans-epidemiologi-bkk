'use server';

// Server Action input manual data penumpang kapal.
// PENTING: peran diverifikasi DI SINI (server), bukan hanya di UI -- jangan percaya role dari client.

import { revalidatePath } from 'next/cache';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { simpanPenumpangKapal, validasiInput } from '@/lib/db/modul/inputPenumpangKapal';

export type HasilSimpanPenumpangKapal =
  | { sukses: true; pesan: string }
  | { sukses: false; error: string };

export async function simpanInputPenumpangKapal(formData: FormData): Promise<HasilSimpanPenumpangKapal> {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    return { sukses: false, error: 'Hanya Petugas atau Admin yang boleh menginput data.' };
  }

  // Tanggal "hari ini" menurut zona waktu kantor, bukan UTC server.
  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const cek = validasiInput(formData, hariIni);
  if ('error' in cek) return { sukses: false, error: cek.error };

  try {
    const { noBaris } = await simpanPenumpangKapal(cek.data);
    revalidatePath('/lalu-lintas-orang');
    revalidatePath('/lalu-lintas-orang/input-penumpang-kapal');
    return { sukses: true, pesan: `Data kapal "${cek.data.namaKapal}" tersimpan (baris ke-${noBaris}).` };
  } catch (e) {
    console.error('[input-penumpang-kapal] gagal menyimpan:', e);
    return { sukses: false, error: 'Gagal menyimpan ke database. Coba lagi; bila terus berulang, hubungi admin.' };
  }
}
