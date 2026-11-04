'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { catatLogin } from '@/lib/analytics/log';
import { sql } from '@/lib/auth/db';
import { masuk, keluar, getPengguna } from '@/lib/auth/session';
import type { Peran } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { kodeKlinikValid } from '@/lib/db/queries/queriesMaster';
import { tentukanTujuanLogin } from '@/lib/auth/tujuan-login';

const MIN_PASSWORD = 8;

const PESAN_MASUK = {
  salah: 'Email atau kata sandi salah.',
  terkunci: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
  belum_disetujui: 'Akun Anda belum disetujui.',
  role_tidak_dikenal: 'Role akun tidak dikenali.',
} as const;

/** Dipanggil dari <form action={formAction}> di app/login/page.tsx. */
export async function login(prevState: any, formData: FormData): Promise<{ error?: string; ok?: boolean; tujuan?: string } | void> {
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

  const tujuan = await tentukanTujuanLogin(String(hasil.role), String(hasil.userId)).catch(() => '/dashboard');
  return { ok: true, tujuan };
}

/** Role yang boleh dipilih saat registrasi: semua role kecuali admin. */
type RoleDaftar = Exclude<Peran, 'admin'>;

// Pemetaan tabel disesuaikan ke poliklinik_non_bkk
const TABEL_KLINIK: Record<'poliklinik' | 'klinik_binaan', string> = {
  poliklinik: 'poliklinik_non_bkk',
  klinik_binaan: 'klinik_binaan',
};

export async function registerPetugas(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const nama = String(formData.get('nama') ?? '').trim();
  const jenisAkun = String(formData.get('jenis_akun') ?? '');
  const peranBkk = String(formData.get('peran_bkk') ?? '');
  const kodeKlinikForm = String(formData.get('kode_klinik') ?? '').trim();

  const gagal = (pesan: string): never => redirect(`/register?error=${encodeURIComponent(pesan)}`);

  if (!nama) gagal('Nama lengkap wajib diisi.');
  if (!email.includes('@')) gagal('Email tidak valid.');
  if (password.length < MIN_PASSWORD) gagal(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);

  // Tentukan role & kode klinik di SERVER (nilai form bisa dipalsukan). 'admin' tidak pernah bisa dipilih di sini.
  let role: RoleDaftar;
  let kodeKlinik: string | null = null;

  if (jenisAkun === 'bkk') {
    if (peranBkk !== 'petugas' && peranBkk !== 'petugas_klinik') gagal('Peran petugas tidak valid.');
    role = peranBkk as RoleDaftar;
  } else if (jenisAkun === 'poliklinik' || jenisAkun === 'klinik_binaan') {
    if (!kodeKlinikForm) gagal('Pilih nama klinik terlebih dahulu.');
    
    // Validasi menggunakan fungsi queriesMaster
    if (!(await kodeKlinikValid(jenisAkun, kodeKlinikForm))) {
      gagal('Klinik yang dipilih tidak terdaftar.');
    }

    // Pastikan data benar-benar ada di tabel referensi yang sesuai
    const namaTabel = TABEL_KLINIK[jenisAkun as 'poliklinik' | 'klinik_binaan'];
    const ada = await sql(`SELECT 1 FROM ${namaTabel} WHERE id = ? LIMIT 1`, [kodeKlinikForm]);

    if (ada.length === 0) gagal('Klinik yang dipilih tidak terdaftar.');
    
    role = jenisAkun;
    kodeKlinik = kodeKlinikForm;
  } else {
    return gagal('Jenis akun tidak valid.');
  }

  const sudahAda = await sql(`SELECT 1 FROM auth_kredensial WHERE email = ? LIMIT 1`, [email]);
  if (sudahAda.length > 0) gagal('Email sudah terdaftar.');

  const id = randomUUID();
  let galat: string | null = null;
  try {
    await sql(
      `INSERT INTO profiles (id, nama_lengkap, role, status) VALUES (?, ?, ?, 'pending')`,
      [id, nama, role]
    );
    try {
      await sql(`INSERT INTO auth_kredensial (user_id, email, password_hash) VALUES (?, ?, ?)`,
        [id, email, await hashPassword(password)]);

      if (role === 'poliklinik' && kodeKlinik) {
        await sql(
          `INSERT INTO poliklinik_non_bkk_akses (user_id, poliklinik_id) VALUES (?, ?::uuid)`,
          [id, kodeKlinik]
        );
      }
      if (role === 'klinik_binaan' && kodeKlinik) {
        await sql(
          `INSERT INTO klinik_akses (user_id, klinik_id) VALUES (?, ?::uuid)`,
          [id, kodeKlinik]
        );
      }
    } catch (e) {
      await sql(`DELETE FROM auth_kredensial WHERE user_id = ?`, [id]).catch(() => undefined);
      await sql(`DELETE FROM profiles WHERE id = ?`, [id]);
      throw e;
    }
  } catch (e: any) {
    console.error('[registerPetugas] gagal:', e?.message, e?.code, e?.detail, e?.constraint, e?.table);
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