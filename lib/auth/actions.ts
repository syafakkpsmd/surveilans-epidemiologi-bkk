'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { catatLogin } from '@/lib/analytics/log';

/**
 * Dipanggil dari <form action={login}> di app/login/page.tsx.
 * Redirect ke /dashboard (URL YANG SAMA dengan yang diakses Tamu)
 * setelah berhasil -- bukan ke halaman "dashboard versi login".
 */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email dan kata sandi wajib diisi.'));
  }

  const supabase = await createClient();

  // 1. Lakukan proses sign in
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData.user) {
    redirect('/login?error=' + encodeURIComponent('Email atau kata sandi salah.'));
  }

  // 2. Ambil data profil dari database (asumsi Anda memiliki tabel 'profiles')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', authData.user.id)
    .single();

  if (profileError || profile?.status !== 'approved') {
    // Jika tidak approved atau error, arahkan kembali atau beri notifikasi
    redirect('/login?error=' + encodeURIComponent('Akun Anda belum disetujui.'));
  }

  // 3. Tambahkan di sini setelah cek profile.status === 'approved'
  await catatLogin(profile.role, authData.user.id);

  // 4. Redirect ke dashboard
  redirect('/dashboard');
}

export async function registerPetugas(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const nama = String(formData.get('nama') ?? '');

  console.log('[registerPetugas] mulai daftar:', email);

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    console.error('[registerPetugas] signUp GAGAL:', JSON.stringify(error, null, 2));
    redirect(`/register?error=${encodeURIComponent(error?.message ?? 'Gagal mendaftar')}`);
  }

  console.log('[registerPetugas] signUp OK, user id:', data.user.id);

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    nama_lengkap: nama,
    role: 'petugas',
    status: 'pending',
  });

  if (profileError) {
    console.error('[registerPetugas] insert profiles GAGAL:', JSON.stringify(profileError, null, 2));
    redirect(`/register?error=${encodeURIComponent(profileError.message)}`);
  }

  console.log('[registerPetugas] BERHASIL total');
  redirect('/register/berhasil');
}

/**
 * Dipanggil dari tombol Logout (mis. <form action={logout}><button>Logout</button></form>
 * di navbar). Setelah logout, kembali ke /dashboard sebagai Tamu --
 * BUKAN dikunci atau diarahkan ke /login, sesuai KONTEKS PROYEK.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/dashboard');
}

/**
 * Dipanggil dari <form action={requestPasswordReset}> di app/forgot-password/page.tsx.
 * Mengirim email reset password lewat Supabase Auth.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/forgot-password?sent=1');
}

/**
 * Dipanggil dari <form action={updatePassword}> di app/reset-password/page.tsx,
 * setelah user klik link reset dari email.
 */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/login?reset=1');
}