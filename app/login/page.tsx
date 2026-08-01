'use client';

import { use, useActionState } from 'react';
import { login } from '@/lib/auth/actions';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  // 1. Unwrap searchParams yang berupa Promise menggunakan React.use()
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;

  // 2. State untuk form action
  const [state, formAction, isPending] = useActionState(login, null);

  // 3. Ambil error message dari state form atau query params URL
  const errorMessage = state?.error || resolvedSearchParams?.error;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF1F4] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image
            src="/logo-bkk.png"
            alt="Logo BKK Kelas I Samarinda"
            width={56}
            height={56}
            className="mx-auto mb-3"
          />
          <p className="text-xs font-semibold tracking-wide uppercase text-[#0F4C5C]">
            BKK Kelas I Samarinda
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[#0F2A38]">
            Masuk ke Surveilans Epidemiologi
          </h1>
          <p className="mt-1 text-sm text-[#0F2A38]/60">
            Login hanya diperlukan untuk mengakses Analisis AI.
            Dashboard tetap bisa dilihat tanpa login.
          </p>
        </div>

        <form
          action={formAction}
          className="bg-white rounded-[10px] shadow-sm border border-black/5 p-6 space-y-4"
        >
          {errorMessage ? (
            <div className="rounded-lg bg-[#D62839]/10 border border-[#D62839]/30 px-3 py-2 text-sm text-[#D62839]">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-[#0F2A38]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={isPending}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0F2A38] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] disabled:bg-gray-100"
              placeholder="nama@contoh.go.id"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-[#0F2A38]">
                Kata sandi
              </label>
              <Link href="/forgot-password" className="text-xs text-[#0F4C5C] hover:underline">
                Lupa kata sandi?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={isPending}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0F2A38] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[#0F2A38] px-3 py-2 text-sm font-medium text-white hover:bg-[#0F4C5C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="text-center mt-4 space-y-1">
          <p className="text-sm text-[#0F2A38]/70">
            Belum punya akun?{' '}
            <Link href="/register" className="text-[#0F4C5C] hover:underline font-medium">
              Daftar sebagai Petugas
            </Link>
          </p>
          <Link href="/dashboard" className="text-sm text-[#0F4C5C] hover:underline">
            Kembali ke dashboard sebagai Tamu
          </Link>
        </div>
      </div>
    </main>
  );
}