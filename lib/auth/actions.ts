'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { catatLogin } from '@/lib/analytics/log';
import { sql } from '@/lib/auth/db';
import { masuk, keluar, getPengguna } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';

const MIN_PASSWORD = 8;

const PESAN_MASUK = {
  salah: 'Email atau kata sandi salah.',
  terkunci: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
  belum_disetujui: 'Akun Anda belum disetujui.',
  role_tidak_dikenal: 'Role akun tidak dikenali.',
} as const;

/** Dipanggil dari <form action={formAction}> di app/login/page.tsx. */
export async function login(prevState: any, formData: FormData): Promise<{ error?: string; ok?: boolean } | void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
  }

  const ip = ((await headers()).get('x-forwarded-for') ?? '').split(',')[0].trim();
  const hasil = await masuk(email, password, ip);
  if (!hasil.ok) return { error: PESAN_MASUK[hasil.alasan] };

  // Catat login secara non-blocking
  catatLogin(hasil.role as any, hasil.userId).catch((err) => {
    console.error('[catatLogin Error]:', err);
  });

  // Halaman login memanggil window.location.assign('/dashboard') saat ok === true
  return { ok: true };
}

export async function registerPetugas(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const nama = String(formData.get('nama') ?? '').trim();

  const gagal = (pesan: string) => redirect(`/register?error=${encodeURIComponent(pesan)}`);

  if (!email.includes('@')) gagal('Email tidak valid.');
  if (password.length < MIN_PASSWORD) gagal(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);

  const ada = await sql(`SELECT 1 FROM auth_kredensial WHERE email = ? LIMIT 1`, [email]);
  if (ada.length > 0) gagal('Email sudah terdaftar.');

  const id = randomUUID();
  let galat: string | null = null;
  try {
    await sql(`INSERT INTO profiles (id, nama_lengkap, role, status) VALUES (?, ?, 'petugas', 'pending')`, [id, nama]);
    try {
      await sql(`INSERT INTO auth_kredensial (user_id, email, password_hash) VALUES (?, ?, ?)`,
        [id, email, await hashPassword(password)]);
    } catch (e) {
      await sql(`DELETE FROM profiles WHERE id = ?`, [id]);
      throw e;
    }
  } catch (e: any) {
    console.error('[registerPetugas] gagal:', e?.message);
    galat = 'Gagal mendaftar. Coba lagi.';
  }
  if (galat) gagal(galat);

  redirect('/register/berhasil');
}

/** Tombol Logout di navbar. Kembali ke /dashboard sebagai Tamu. */
export async function logout(): Promise<void> {
  await keluar();
  redirect('/dashboard');
}

/**
 * Reset password kini dilakukan admin (halaman /admin/users). Bila nanti SMTP tersedia,
 * fungsi ini dapat diganti dengan pengiriman tautan reset.
 */
export async function requestPasswordReset(_formData: FormData) {
  redirect(`/forgot-password?error=${encodeURIComponent('Hubungi admin untuk mengatur ulang kata sandi Anda.')}`);
}

/** Ganti kata sandi akun yang sedang login. */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const p = await getPengguna();
  if (!p) redirect('/login');

  if (password.length < MIN_PASSWORD) {
    redirect(`/reset-password?error=${encodeURIComponent(`Kata sandi minimal ${MIN_PASSWORD} karakter.`)}`);
  }

  await sql(`UPDATE auth_kredensial SET password_hash = ? WHERE user_id = ?`, [await hashPassword(password), p!.id]);
  await sql(`DELETE FROM auth_sesi WHERE user_id = ?`, [p!.id]);
  await keluar();
  redirect('/login?reset=1');
}