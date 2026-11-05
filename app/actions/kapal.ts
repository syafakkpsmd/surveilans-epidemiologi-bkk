'use server';

import { getUserRole } from '@/lib/auth/get-user-role';
import { tambahKapal, type Kapal } from '@/lib/db/modul/kapal';
import { getWilkerPelabuhan } from '@/lib/db/modul/inputPenumpangKapal';

export async function aksiTambahKapal(nama: string, wilker: string): Promise<{ ok: true; kapal: Kapal } | { ok: false; error: string }> {
  const role = await getUserRole();
  if (role !== 'petugas' && role !== 'admin') return { ok: false, error: 'Tidak diizinkan.' };

  const bersih = nama.replace(/\s+/g, ' ').trim();
  if (bersih.length < 2) return { ok: false, error: 'Nama kapal terlalu pendek.' };
  if (bersih.length > 100) return { ok: false, error: 'Nama kapal terlalu panjang.' };
  if (!(await getWilkerPelabuhan()).some((w) => w.kode === wilker)) return { ok: false, error: 'Pelabuhan tidak valid.' };

  try {
    return { ok: true, kapal: await tambahKapal(bersih, wilker) };
  } catch (e: any) {
    console.error('[aksiTambahKapal]', e?.message);
    return { ok: false, error: 'Gagal menambah kapal.' };
  }
}