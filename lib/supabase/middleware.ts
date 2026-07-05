import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Merefresh session Supabase (kalau perlu) di setiap request yang lolos
 * matcher di middleware.ts. Ini WAJIB ada supaya session tidak expired
 * secara tidak konsisten antar Server Component.
 *
 * Logika PROTEKSI ROUTE (redirect ke /login kalau belum login) SENGAJA
 * belum ditambahkan di sini -- itu bagian dari Segmen 3 (Autentikasi),
 * karena butuh halaman /login sudah ada dulu supaya tidak salah redirect
 * ke halaman yang belum dibuat.
 */
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Memanggil getUser() (bukan getSession()) supaya token diverifikasi ulang
  // ke server Supabase, bukan hanya dibaca dari cookie yang bisa saja sudah
  // kedaluwarsa. Hasilnya sengaja tidak dipakai di sini -- baru dipakai
  // untuk logika redirect di Segmen 3.
  await supabase.auth.getUser();

  return supabaseResponse;
}
