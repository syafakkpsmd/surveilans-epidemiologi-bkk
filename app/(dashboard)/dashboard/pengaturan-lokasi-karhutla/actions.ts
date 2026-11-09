// app/(dashboard)/dashboard/pengaturan-lokasi-karhutla/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createDbServiceClient } from '@/lib/db/serviceRole';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

async function pastikanAdmin() {
  const role = await getUserRole();
  if (role !== 'admin') throw new Error('Hanya admin yang boleh mengubah data ini.');
}

/** Kode wilayah kerja harus dikenal di wilker_ref. */
async function pastikanKodeWilker(kode: string) {
  if (!(await getKamusWilker()).isKode(kode)) throw new Error(`Kode wilayah kerja "${kode}" tidak dikenal (lihat pengaturan wilayah kerja).`);
}

/** Checkbox "kasus ISPA dihitung otomatis dari Kunjungan Poliklinik"; wajib punya zona. */
function bacaDariPoliklinik(formData: FormData): boolean {
  const ya = formData.get('dari_poliklinik') === 'on';
  if (ya && !((formData.get('zona') as string) || '').trim()) {
    throw new Error('Wilayah ISPA yang dihitung dari poliklinik harus punya zona (nama klinik/zona).');
  }
  return ya;
}

export async function tambahWilayahIspa(formData: FormData) {
  await pastikanAdmin();
  const supabase = createDbServiceClient();
  await pastikanKodeWilker(formData.get('kode_wilker') as string);

  // `as never`: types/generated.types.ts belum memuat kolom dari_poliklinik (migrasi 25); hapus setelah tipe diregenerasi.
  const { error } = await supabase.from('wilayah_ispa').insert({
    label: formData.get('label') as string,
    kode_wilker: formData.get('kode_wilker') as string,
    zona: (formData.get('zona') as string) || null,
    dari_poliklinik: bacaDariPoliklinik(formData),
    urutan: 999,
  } as never);
  if (error) throw new Error(`Gagal menambah wilayah: ${error.message}`);

  revalidatePath('/dashboard/pengaturan-lokasi-karhutla');
  revalidatePath('/dashboard/karhutla');
  revalidatePath('/dashboard/karhutla/data');
}

export async function hapusWilayahIspa(id: string) {
  await pastikanAdmin();
  const supabase = createDbServiceClient();

  const { error } = await supabase.from('wilayah_ispa').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus wilayah: ${error.message}`);

  revalidatePath('/dashboard/pengaturan-lokasi-karhutla');
  revalidatePath('/dashboard/karhutla');
  revalidatePath('/dashboard/karhutla/data');
}

export async function perbaruiWilayahIspa(id: string, formData: FormData) {
  await pastikanAdmin();
  const supabase = createDbServiceClient();

  await pastikanKodeWilker(formData.get('kode_wilker') as string);
  const { error } = await supabase
    .from('wilayah_ispa')
    .update({
      label: formData.get('label') as string,
      kode_wilker: formData.get('kode_wilker') as string,
      zona: (formData.get('zona') as string) || null,
      dari_poliklinik: bacaDariPoliklinik(formData),
    } as never)
    .eq('id', id);
  if (error) throw new Error(`Gagal mengubah wilayah: ${error.message}`);

  revalidatePath('/dashboard/pengaturan-lokasi-karhutla');
  revalidatePath('/dashboard/karhutla');
  revalidatePath('/dashboard/karhutla/data');
}

export async function perbaruiLokasiUdara(id: string, formData: FormData) {
  await pastikanAdmin();
  const supabase = createDbServiceClient();

  const lokasiInduk = formData.get('lokasi_induk') as string;
  const subLokasi = (formData.get('sub_lokasi') as string) || null;
  const nama = subLokasi ? `${lokasiInduk} (${subLokasi})` : lokasiInduk;

  const { error } = await supabase
    .from('lokasi_kualitas_udara')
    .update({
      nama,
      lokasi_induk: lokasiInduk,
      sub_lokasi: subLokasi,
    })
    .eq('id', id);
  if (error) throw new Error(`Gagal mengubah lokasi: ${error.message}`);

  revalidatePath('/dashboard/pengaturan-lokasi-karhutla');
  revalidatePath('/dashboard/karhutla');
  revalidatePath('/dashboard/karhutla/data');
}

export async function tambahLokasiUdara(formData: FormData) {
  await pastikanAdmin();
  const supabase = createDbServiceClient();

  const lokasiInduk = formData.get('lokasi_induk') as string;
  const subLokasi = (formData.get('sub_lokasi') as string) || null;
  const nama = subLokasi ? `${lokasiInduk} (${subLokasi})` : lokasiInduk;

  const { error } = await supabase.from('lokasi_kualitas_udara').insert({
    nama,
    lokasi_induk: lokasiInduk,
    sub_lokasi: subLokasi,
    urutan: 999,
  });
  if (error) throw new Error(`Gagal menambah lokasi: ${error.message}`);

  revalidatePath('/dashboard/pengaturan-lokasi-karhutla');
  revalidatePath('/dashboard/karhutla');
  revalidatePath('/dashboard/karhutla/data');
}

export async function hapusLokasiUdara(id: string) {
  await pastikanAdmin();
  const supabase = createDbServiceClient();

  const { error } = await supabase.from('lokasi_kualitas_udara').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus lokasi: ${error.message}`);

  revalidatePath('/dashboard/pengaturan-lokasi-karhutla');
  revalidatePath('/dashboard/karhutla');
  revalidatePath('/dashboard/karhutla/data');
}