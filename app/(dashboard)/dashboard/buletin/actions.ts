'use server';

// app/buletin/actions.ts  (sesuaikan lokasi dengan folder page.tsx buletin Anda,
// lalu samakan path import di BuletinInteraktif.tsx)
import { revalidatePath } from 'next/cache';
import { getUserRole } from '@/lib/auth/get-user-role';
// TODO: kalau proyek Anda sudah punya pool pg (mis. '@/lib/db'), pakai itu
// dan hapus blok Pool di bawah.
import { Pool } from 'pg';

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

function getPool(): Pool {
  if (globalForPg.__pgPool) return globalForPg.__pgPool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL belum diatur di .env.local (restart `npm run dev` setelah mengubahnya).');
  }
  globalForPg.__pgPool = new Pool({
    connectionString: url,
    // ssl: { rejectUnauthorized: false }, // aktifkan jika server PostgreSQL mewajibkan SSL
  });
  return globalForPg.__pgPool;
}

const pool = { query: (teks: string, nilai?: any[]) => getPool().query(teks, nilai) };

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
      'UPDATE buletin SET ringkasan_eksekutif = $1 WHERE id = $2', // TODO: sesuaikan nama tabel
      [teks || null, id],
    );
    if (res.rowCount === 0) return { ok: false, error: 'Buletin tidak ditemukan.' };
    revalidatePath('/buletin');
    return { ok: true };
  } catch (e) {
    console.error('Gagal menyimpan ringkasan buletin:', e);
    return { ok: false, error: 'Terjadi kesalahan saat menyimpan.' };
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
       VALUES ($1, $2, $3, $4, $5, $6)
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
    revalidatePath('/buletin');
    return { ok: true, data: res.rows[0] };
  } catch (e) {
    console.error('Gagal menambah buletin:', e);
    return { ok: false, error: 'Gagal menambah buletin.' };
  }
}

export async function ubahBuletin(id: string, i: InputBuletin): Promise<Hasil> {
  if (!(await bolehMengubah())) return { ok: false, error: 'Anda tidak memiliki izin mengubah buletin.' };
  const err = validasi(i);
  if (err) return { ok: false, error: err };

  try {
    const res = await pool.query(
      `UPDATE buletin
          SET tahun = $1, minggu_ke = $2, nama_kegiatan = $3, tipe_link = $4, link_url = $5
        WHERE id = $6
        RETURNING ${KOLOM}`,
      [i.tahun, i.minggu_ke, i.nama_kegiatan.trim(), i.tipe_link.trim(), i.link_url.trim(), id],
    );
    if (res.rowCount === 0) return { ok: false, error: 'Buletin tidak ditemukan.' };
    revalidatePath('/buletin');
    return { ok: true, data: res.rows[0] };
  } catch (e) {
    console.error('Gagal mengubah buletin:', e);
    return { ok: false, error: 'Gagal mengubah buletin.' };
  }
}

export async function hapusBuletin(id: string): Promise<Hasil> {
  if (!(await bolehMengubah())) return { ok: false, error: 'Anda tidak memiliki izin menghapus buletin.' };
  try {
    const res = await pool.query('DELETE FROM buletin WHERE id = $1', [id]);
    if (res.rowCount === 0) return { ok: false, error: 'Buletin tidak ditemukan.' };
    revalidatePath('/buletin');
    return { ok: true };
  } catch (e) {
    console.error('Gagal menghapus buletin:', e);
    return { ok: false, error: 'Gagal menghapus buletin.' };
  }
}