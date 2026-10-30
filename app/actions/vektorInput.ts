'use server';

import { revalidatePath } from 'next/cache';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient } from '@/lib/db/client';
import { DEFINISI_VEKTOR, type JenisVektor } from '@/lib/vektor/skema-input';
import { simpanBarisVektor, type HasilSimpan, type ModeSimpan } from '@/lib/vektor/simpan';

const MAKS_BARIS_PER_PANGGILAN = 300;

export type HasilAksiVektor = { ok: true; hasil: HasilSimpan } | { ok: false; pesan: string };

/**
 * Simpan satu atau banyak baris data vektor (form manual maupun impor Excel).
 * Hanya admin/petugas. Semua nilai divalidasi ulang di sini.
 */
export async function simpanDataVektor(input: {
  jenis: JenisVektor;
  baris: Record<string, unknown>[];
  mode: ModeSimpan;
}): Promise<HasilAksiVektor> {
  const user = await getPengguna();
  if (!user) return { ok: false, pesan: 'Anda harus login.' };
  if (user.role !== 'admin' && user.role !== 'petugas') {
    return { ok: false, pesan: 'Hanya admin/petugas yang boleh menginput data vektor.' };
  }

  const def = DEFINISI_VEKTOR[input.jenis];
  if (!def) return { ok: false, pesan: 'Jenis data tidak dikenal.' };
  if (!Array.isArray(input.baris) || input.baris.length === 0) return { ok: false, pesan: 'Tidak ada data untuk disimpan.' };
  if (input.baris.length > MAKS_BARIS_PER_PANGGILAN) {
    return { ok: false, pesan: `Maksimal ${MAKS_BARIS_PER_PANGGILAN} baris per pengiriman.` };
  }
  const mode: ModeSimpan = input.mode === 'perbarui' ? 'perbarui' : 'lewati';

  try {
    const inputOleh = (user.namaLengkap || user.email || '').slice(0, 255) || null;
    const hasil = await simpanBarisVektor(getDbClient(), def, input.baris, mode, inputOleh);
    if (hasil.disimpan + hasil.diperbarui > 0) revalidatePath('/dashboard/vektor', 'layout');
    return { ok: true, hasil };
  } catch (err) {
    console.error('[simpanDataVektor]', err);
    return { ok: false, pesan: 'Gagal menyimpan ke database. Coba lagi, atau hubungi admin bila berulang.' };
  }
}