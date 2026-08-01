'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { catatLogin } from '@/lib/analytics/log';

/**
 * Dipanggil dari <form action={formAction}> di app/login/page.tsx.
 * Redirect ke /dashboard setelah berhasil.
 */
export async function login(prevState: any, formData: FormData): Promise<{ error?: string } | void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
  }

  const supabase = await createClient();

  // 1. Lakukan proses sign in
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData.user) {
    return { error: 'Email atau kata sandi salah.' };
  }

  // 2. Ambil data profil dari database (asumsi tabel 'profiles')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', authData.user.id)
    .single();

  if (profileError || profile?.status !== 'approved') {
    return { error: 'Akun Anda belum disetujui.' };
  }

  if (profile.role !== 'petugas' && profile.role !== 'admin') {
    return { error: 'Role akun tidak dikenali.' };
  }

  // 3. Catat login secara non-blocking (jalan di background tanpa bikin gantung)
  catatLogin(profile.role, authData.user.id).catch((err) => {
    console.error('[catatLogin Error]:', err);
  });

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
 * Dipanggil dari tombol Logout di navbar.
 * Kembali ke /dashboard sebagai Tamu.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/dashboard');
}

/**
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
 * Memperbarui kata sandi user setelah klik link reset.
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