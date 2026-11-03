'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import { tambahPoliklinikNonBkk, tambahWilayahKerja, setAktifMaster } from '@/lib/db/queries/queriesMaster';

const JENIS_WILAYAH = ['pelabuhan', 'bandara', 'pos_lintas_batas', 'lainnya'];

async function wajibAdmin() {
  if ((await getUserRole()) !== 'admin') throw new Error('Hanya admin yang boleh mengubah data master.');
}

/** "Pelabuhan Samarinda" -> "pelabuhan-samarinda" */
function buatKode(teks: string): string {
  return teks.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export async function aksiTambahWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const nama = String(formData.get('nama') ?? '').trim();
  const jenis = String(formData.get('jenis') ?? 'pelabuhan');
  const urutan = Number(formData.get('urutan') ?? 0) || 0;
  if (!nama) throw new Error('Nama wajib diisi.');
  if (!JENIS_WILAYAH.includes(jenis)) throw new Error('Jenis tidak valid.');
  await tambahWilayahKerja({ kode: buatKode(nama), nama, jenis, urutan });
  revalidatePath('/admin/master');
}

export async function aksiTambahPoliklinikNonBkk(formData: FormData) {
  await wajibAdmin();
  const nama = String(formData.get('nama') ?? '').trim();
  const alamat = String(formData.get('alamat') ?? '').trim() || null;
  const kabupaten_kota = String(formData.get('kabupaten_kota') ?? '').trim() || null;
  const telepon = String(formData.get('telepon') ?? '').trim() || null;
  if (!nama) throw new Error('Nama wajib diisi.');
  await tambahPoliklinikNonBkk({ nama, alamat, kabupaten_kota, telepon });
  revalidatePath('/admin/master');
  revalidatePath('/register');
}

export async function aksiSetAktif(tabel: 'wilayah_kerja' | 'poliklinik_non_bkk', id: number | string, aktif: boolean) {
  await wajibAdmin();
  await setAktifMaster(tabel, id, aktif);
  revalidatePath('/admin/master');
}