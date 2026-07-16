/**
 * Helper dipanggil dari middleware.ts di root project.
 *
 * TUGAS SATU-SATUNYA fungsi ini: me-refresh token sesi Supabase di
 * setiap request (pola resmi @supabase/ssr untuk Next.js), supaya
 * status login (getUserRole, supabase.auth.getUser() di Server
 * Component) selalu akurat.
 *
 * SENGAJA TIDAK ADA logika redirect ke /login di sini. Sesuai
 * KONTEKS PROYEK: dashboard bisa diakses tanpa login (sebagai Tamu).
 * Redirect ke /login hanya boleh terjadi kalau user mengklik tombol
 * "Login" secara eksplisit (link biasa ke /login), BUKAN dipaksa oleh
 * middleware.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // WAJIB dipanggil (bukan cuma dibaca hasilnya) supaya token direfresh
  // kalau sudah kedaluwarsa. Jangan hapus baris ini meski nilainya
  // tidak dipakai langsung di sini.
  await supabase.auth.getUser();

  // TIDAK ADA pengecekan "kalau belum login, redirect ke /login" di
  // sini -- lihat komentar di atas. Middleware ini murni refresh sesi.

  return supabaseResponse;
}