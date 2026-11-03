'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/auth/db';
import { getDbClient } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/guard';
import { hapusSesiPengguna } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import type { PeranUser } from '@/types/domain.types';

const ROLE_VALID = ['admin', 'petugas', 'petugas_klinik', 'poliklinik', 'klinik_binaan'];
const MIN_PASSWORD = 8;
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateUserRole(userId: string, role: PeranUser) {
  const admin = await requireAdmin();
  if (!ROLE_VALID.includes(role as string)) throw new Error('Role tidak valid.');
  if (admin.id === userId && role !== 'admin') {
    throw new Error('Tidak bisa mengubah role akun sendiri.');
  }
  await sql(`UPDATE profiles SET role = ? WHERE id = ?`, [role, userId]);
  // Tautan hanya berlaku untuk perannya masing-masing; bersihkan bila peran berpindah.
  if (role !== 'klinik_binaan') await sql(`DELETE FROM klinik_akses WHERE user_id = ?`, [userId]);
  if (role !== 'poliklinik') await sql(`DELETE FROM poliklinik_non_bkk_akses WHERE user_id = ?`, [userId]);
  revalidatePath('/admin/users');
}

export async function approveUser(userId: string) {
  await requireAdmin();
  await sql(`UPDATE profiles SET status = 'approved' WHERE id = ?`, [userId]);
  revalidatePath('/admin/users');
}

export async function suspendUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error('Tidak bisa menangguhkan akun sendiri.');
  await sql(`UPDATE profiles SET status = 'suspended' WHERE id = ?`, [userId]);
  await hapusSesiPengguna(userId);
  revalidatePath('/admin/users');
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error('Tidak bisa menghapus akun sendiri.');
  await hapusSesiPengguna(userId);
  await sql(`DELETE FROM klinik_akses WHERE user_id = ?`, [userId]);
  await sql(`DELETE FROM poliklinik_non_bkk_akses WHERE user_id = ?`, [userId]);
  await sql(`DELETE FROM auth_kredensial WHERE user_id = ?`, [userId]);
  await sql(`DELETE FROM profiles WHERE id = ?`, [userId]);
  revalidatePath('/admin/users');
}

export async function updateUserNama(userId: string, nama: string) {
  await requireAdmin();
  await sql(`UPDATE profiles SET nama_lengkap = ? WHERE id = ?`, [nama, userId]);
  revalidatePath('/admin/users');
}

/** Admin mengatur ulang kata sandi pengguna (pengganti email reset). */
export async function resetPasswordUser(userId: string, passwordBaru: string) {
  await requireAdmin();
  if (passwordBaru.length < MIN_PASSWORD) throw new Error(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
  await sql(`UPDATE auth_kredensial SET password_hash = ? WHERE user_id = ?`, [await hashPassword(passwordBaru), userId]);
  await hapusSesiPengguna(userId);
  revalidatePath('/admin/users');
}

/** Ganti seluruh daftar tautan sebuah akun lewat satu transaksi. */
async function gantiTautan(tabel: 'klinik_akses' | 'poliklinik_non_bkk_akses', kolom: 'klinik_id' | 'poliklinik_id', userId: string, ids: string[]) {
  const tx = await getDbClient().transaction();
  try {
    await tx.execute({ sql: `DELETE FROM ${tabel} WHERE user_id = ?`, args: [userId] });
    for (const id of ids) {
      await tx.execute({ sql: `INSERT INTO ${tabel} (user_id, ${kolom}) VALUES (?, ?)`, args: [userId, id] });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

/**
 * Tautkan akun KLINIK BINAAN ke klinik-klinik tertentu (mengganti seluruh daftar tautan akun itu).
 * Tanpa tautan, akun tidak melihat data klinik mana pun. Hanya admin.
 */
export async function setKlinikAkses(userId: string, klinikIds: string[]) {
  await requireAdmin();
  const profil = await sql<{ role: string }>('SELECT role FROM profiles WHERE id = ?', [userId]);
  if (!profil.length) throw new Error('Akun tidak ditemukan.');
  if (profil[0].role !== 'klinik_binaan') throw new Error('Tautan klinik hanya untuk akun berperan Klinik Binaan.');

  const unik = [...new Set(klinikIds.filter((x) => typeof x === 'string' && POLA_UUID.test(x)))];
  if (unik.length) {
    const ada = await sql<{ id: string }>(
      `SELECT id FROM klinik_binaan WHERE kategori = 'klinik' AND id IN (${unik.map(() => '?').join(',')})`,
      unik
    );
    if (ada.length !== unik.length) throw new Error('Ada klinik yang tidak ditemukan.');
  }
  await gantiTautan('klinik_akses', 'klinik_id', userId, unik);
  revalidatePath('/admin/users');
}

/** Tautkan akun POLIKLINIK ke poliklinik non-BKK. Hanya admin. */
export async function setPoliklinikAkses(userId: string, poliklinikIds: string[]) {
  await requireAdmin();
  const profil = await sql<{ role: string }>('SELECT role FROM profiles WHERE id = ?', [userId]);
  if (!profil.length) throw new Error('Akun tidak ditemukan.');
  if (profil[0].role !== 'poliklinik') throw new Error('Tautan poliklinik hanya untuk akun berperan Poliklinik.');

  const unik = [...new Set(poliklinikIds.filter((x) => typeof x === 'string' && POLA_UUID.test(x)))];
  if (unik.length) {
    const ada = await sql<{ id: string }>(
      `SELECT id FROM poliklinik_non_bkk WHERE id IN (${unik.map(() => '?').join(',')})`,
      unik
    );
    if (ada.length !== unik.length) throw new Error('Ada poliklinik yang tidak ditemukan.');
  }
  await gantiTautan('poliklinik_non_bkk_akses', 'poliklinik_id', userId, unik);
  revalidatePath('/admin/users');
}