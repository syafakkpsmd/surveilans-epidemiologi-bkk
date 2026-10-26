'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/auth/db';
import { requireAdmin } from '@/lib/auth/guard';
import { hapusSesiPengguna } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import type { PeranUser } from '@/types/domain.types';

const ROLE_VALID = ['admin', 'petugas', 'petugas_klinik'];
const MIN_PASSWORD = 8;

export async function updateUserRole(userId: string, role: PeranUser) {
  const admin = await requireAdmin();
  if (!ROLE_VALID.includes(role as string)) throw new Error('Role tidak valid.');
  if (admin.id === userId && role !== 'admin') {
    throw new Error('Tidak bisa mengubah role akun sendiri.');
  }
  await sql(`UPDATE profiles SET role = ? WHERE id = ?`, [role, userId]);
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
  await sql(`DELETE FROM auth_kredensial WHERE user_id = ?`, [userId]);
  await sql(`DELETE FROM profiles WHERE id = ?`, [userId]);
  revalidatePath('/admin/users');
}

export async function updateUserNama(userId: string, nama: string) {
  await requireAdmin();
  await sql(`UPDATE profiles SET nama_lengkap = ? WHERE id = ?`, [nama, userId]);
  revalidatePath('/admin/users');
}

/** BARU: admin mengatur ulang kata sandi pengguna (pengganti email reset). */
export async function resetPasswordUser(userId: string, passwordBaru: string) {
  await requireAdmin();
  if (passwordBaru.length < MIN_PASSWORD) throw new Error(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
  await sql(`UPDATE auth_kredensial SET password_hash = ? WHERE user_id = ?`, [await hashPassword(passwordBaru), userId]);
  await hapusSesiPengguna(userId);
  revalidatePath('/admin/users');
}