'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import { tambahPoliklinikNonBkk, tambahWilayahKerja, setAktifMaster } from '@/lib/db/queries/queriesMaster';
import { redirect } from 'next/navigation';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';
import { ubahPoliklinikNonBkk } from '@/lib/db/queries/queriesMaster';


const JENIS_WILAYAH = ['pelabuhan', 'bandara', 'pos_lintas_batas', 'lainnya'];

async function wajibAdmin() {
  if ((await getUserRole()) !== 'admin') throw new Error('Hanya admin yang boleh mengubah data master.');
}

/** "Pelabuhan Samarinda" -> "pelabuhan-samarinda" */
function buatKode(teks: string): string {
  return teks.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}


export async function aksiUbahPoliklinikNonBkk(formData: FormData) {
  await wajibAdmin();
  const id = String(formData.get('id') ?? '');
  const kembali = (pesan: string): never =>
    redirect(`/admin/master/${id}?error=${encodeURIComponent(pesan)}`);

  const nama = String(formData.get('nama') ?? '').replace(/\s+/g, ' ').trim();
  const kode_wilker = String(formData.get('kode_wilker') ?? '');
  const alamat = String(formData.get('alamat') ?? '').trim() || null;
  const kabupaten_kota = String(formData.get('kabupaten_kota') ?? '').trim() || null;
  const telepon = String(formData.get('telepon') ?? '').trim() || null;

  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/admin/master');
  if (nama.length < 3) kembali('Nama poliklinik minimal 3 karakter.');
  const wk = WILAYAH_KERJA.find((w) => w.kode === kode_wilker);
  if (!wk) kembali('Wilayah kerja tidak valid.');

  try {
    await ubahPoliklinikNonBkk(id, { nama, kode_wilker, namaWilker: wk!.namaPendek, alamat, kabupaten_kota, telepon });
  } catch (e: any) {
    if (e?.code === '23505') kembali('Nama poliklinik sudah dipakai.');
    console.error('[aksiUbahPoliklinikNonBkk]', e?.message);
    kembali('Gagal menyimpan perubahan.');
  }
  revalidatePath('/admin/master');
  revalidatePath('/dashboard/poliklinik-non-bkk');
  redirect('/admin/master?ok=1');
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
  const kembali = (pesan: string): never => redirect(`/admin/master?error=${encodeURIComponent(pesan)}`);

  const nama = String(formData.get('nama') ?? '').replace(/\s+/g, ' ').trim();
  const kode_wilker = String(formData.get('kode_wilker') ?? '');
  const alamat = String(formData.get('alamat') ?? '').trim() || null;
  const kabupaten_kota = String(formData.get('kabupaten_kota') ?? '').trim() || null;
  const telepon = String(formData.get('telepon') ?? '').trim() || null;

  if (nama.length < 3) kembali('Nama poliklinik minimal 3 karakter.');
  if (!WILAYAH_KERJA.some((w) => w.kode === kode_wilker)) kembali('Wilayah kerja tidak valid.');

  try {
    await tambahPoliklinikNonBkk({ nama, kode_wilker, alamat, kabupaten_kota, telepon });
  } catch (e: any) {
    if (e?.code === '23505') kembali('Nama poliklinik sudah terdaftar.');
    console.error('[aksiTambahPoliklinikNonBkk]', e?.message);
    kembali('Gagal menambah poliklinik.');
  }
  revalidatePath('/admin/master');
  revalidatePath('/register');
  redirect('/admin/master?ok=1');
}

export async function aksiSetAktif(tabel: 'wilayah_kerja' | 'poliklinik_non_bkk', id: number | string, aktif: boolean) {
  await wajibAdmin();
  await setAktifMaster(tabel, id, aktif);
  revalidatePath('/admin/master');
}