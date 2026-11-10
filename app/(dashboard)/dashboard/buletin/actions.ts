'use server';

import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getDbClient } from '@/lib/db/client';

// Memakai koneksi database yang SAMA dengan seluruh aplikasi (lib/db/client.ts), yang juga mendukung
// DB_USER/DB_NAME/DB_SOCKET. Sebelumnya file ini membuat Pool sendiri yang hanya membaca DATABASE_URL.
const pool = {
  query: async (teks: string, nilai: unknown[] = []) => {
    const hasil = await getDbClient().execute({ sql: teks, args: nilai as never[] });
    return { rows: hasil.rows, rowCount: hasil.rowsAffected };
  },
};

/** Pesan untuk pengguna; kolom hilang (kode 42703) dijelaskan jelas karena bisa diperbaiki dengan migrasi 27. */
function pesanGagal(e: unknown, bawaan: string): string {
  const kode = (e as { code?: string })?.code;
  if (kode === '42703') return 'Kolom buletin belum ada di database. Minta admin menjalankan scripts/migrate/27_buletin_kolom_ringkasan.sql.';
  if (kode === '42P01') return 'Tabel buletin tidak ditemukan di database.';
  return bawaan;
}

type InputBuletin = {
  tahun: number;
  minggu_ke: number | null;
  nama_kegiatan: string;
  tipe_link: string;
  link_url: string;
  ringkasan_eksekutif?: string;
};
type Hasil = { ok: boolean; error?: string; data?: any };

const KOLOM = 'id, tahun, minggu_ke, nama_kegiatan, tipe_link, link_url, ringkasan_eksekutif';

async function bolehMengubah(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin' || role === 'petugas';
}

function validasi(i: InputBuletin): string | null {
  if (!Number.isInteger(i.tahun) || i.tahun < 2000 || i.tahun > 2100) return 'Tahun tidak valid.';
  if (i.minggu_ke != null && (!Number.isInteger(i.minggu_ke) || i.minggu_ke < 1 || i.minggu_ke > 53))
    return 'Minggu ke harus antara 1 dan 53.';
  if (!i.nama_kegiatan?.trim()) return 'Nama kegiatan wajib diisi.';
  try {
    const u = new URL(i.link_url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'Link harus diawali http:// atau https://';
  } catch {
    return 'Link buletin tidak valid.';
  }
  return null;
}

export async function simpanRingkasanBuletin(id: string, ringkasan: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await bolehMengubah())) return { ok: false, error: 'Anda tidak memiliki izin mengubah ringkasan.' };

  const teks = (ringkasan ?? '').trim().slice(0, 1200);
  try {
    const res = await pool.query(
      'UPDATE buletin SET ringkasan_eksekutif = ? WHERE id = ?',
      [teks || null, id],
    );
    if (res.rowCount === 0) return { ok: false, error: 'Buletin tidak ditemukan.' };
    revalidatePath('/dashboard/buletin');
    return { ok: true };
  } catch (e) {
    console.error('Gagal menyimpan ringkasan buletin:', e);
    return { ok: false, error: pesanGagal(e, 'Terjadi kesalahan saat menyimpan.') };
  }
}

export async function tambahBuletin(i: InputBuletin): Promise<Hasil> {
  if (!(await bolehMengubah())) return { ok: false, error: 'Anda tidak memiliki izin menambah buletin.' };
  const err = validasi(i);
  if (err) return { ok: false, error: err };

  try {
    // Kolom id diasumsikan punya DEFAULT (uuid / serial). Kalau tidak, tambahkan id secara manual.
    const res = await pool.query(
      `INSERT INTO buletin (tahun, minggu_ke, nama_kegiatan, tipe_link, link_url, ringkasan_eksekutif)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING ${KOLOM}`,
      [
        i.tahun,
        i.minggu_ke,
        i.nama_kegiatan.trim(),
        i.tipe_link.trim(),
        i.link_url.trim(),
        (i.ringkasan_eksekutif ?? '').trim().slice(0, 1200) || null,
      ],
    );
    revalidatePath('/dashboard/buletin');
    return { ok: true, data: res.rows[0] };
  } catch (e) {
    console.error('Gagal menambah buletin:', e);
    return { ok: false, error: pesanGagal(e, 'Gagal menambah buletin.') };
  }
}

export async function ubahBuletin(id: string, i: InputBuletin): Promise<Hasil> {
  if (!(await bolehMengubah())) return { ok: false, error: 'Anda tidak memiliki izin mengubah buletin.' };
  const err = validasi(i);
  if (err) return { ok: false, error: err };

  try {
    const res = await pool.query(
      `UPDATE buletin
          SET tahun = ?, minggu_ke = ?, nama_kegiatan = ?, tipe_link = ?, link_url = ?
        WHERE id = ?
        RETURNING ${KOLOM}`,
      [i.tahun, i.minggu_ke, i.nama_kegiatan.trim(), i.tipe_link.trim(), i.link_url.trim(), id],
    );
    if (res.rowCount === 0) return { ok: false, error: 'Buletin tidak ditemukan.' };
    revalidatePath('/dashboard/buletin');
    return { ok: true, data: res.rows[0] };
  } catch (e) {
    console.error('Gagal mengubah buletin:', e);
    return { ok: false, error: pesanGagal(e, 'Gagal mengubah buletin.') };
  }
}

export async function hapusBuletin(id: string): Promise<Hasil> {
  if (!(await bolehMengubah())) return { ok: false, error: 'Anda tidak memiliki izin menghapus buletin.' };
  try {
    const res = await pool.query('DELETE FROM buletin WHERE id = $1', [id]);
    if (res.rowCount === 0) return { ok: false, error: 'Buletin tidak ditemukan.' };
    revalidatePath('/dashboard/buletin');
    return { ok: true };
  } catch (e) {
    console.error('Gagal menghapus buletin:', e);
    return { ok: false, error: 'Gagal menghapus buletin.' };
  }
}