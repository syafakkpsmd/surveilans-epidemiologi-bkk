/**
 * Helper dipanggil dari middleware.ts di root project.
 *
 * TUGAS UTAMA fungsi ini: me-refresh token sesi Supabase di setiap
 * request (pola resmi @supabase/ssr untuk Next.js), supaya status
 * login (getUserRole, supabase.auth.getUser() di Server Component)
 * selalu akurat.
 *
 * SENGAJA TIDAK ADA logika redirect ke /login di sini. Sesuai
 * KONTEKS PROYEK: dashboard bisa diakses tanpa login (sebagai Tamu).
 * Redirect ke /login hanya boleh terjadi kalau user mengklik tombol
 * "Login" secara eksplisit (link biasa ke /login), BUKAN dipaksa oleh
 * middleware.
 *
 * TAMBAHAN: inactivity auto-logout SERVER-SIDE. Berbeda dari timer
 * client-side (components/InactivityLogout.tsx) yang mati begitu tab
 * ditutup, pengecekan di sini jalan di SETIAP REQUEST BARU ke server
 * -- jadi tetap efektif walau tab lama sudah ditutup dan user buka
 * lagi berjam-jam kemudian. Cookie `last_activity` menyimpan waktu
 * request terakhir; kalau sudah lewat BATAS_INAKTIVITAS_MS sejak
 * cookie itu, sesi di-signOut paksa SEBELUM request diproses lebih
 * lanjut (sehingga getUserRole() di halaman tujuan sudah membaca
 * status logout, bukan status lama).
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const BATAS_INAKTIVITAS_MS = 15 * 60 * 1000; // 15 menit
const NAMA_COOKIE_AKTIVITAS = 'last_activity';

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
  const { data: { user } } = await supabase.auth.getUser();

  // ============================================================
  // INACTIVITY AUTO-LOGOUT (server-side) -- hanya relevan untuk
  // request yang SUDAH login (Tamu tidak punya sesi untuk di-logout).
  // ============================================================
  if (user) {
    const cookieAktivitas = request.cookies.get(NAMA_COOKIE_AKTIVITAS)?.value;
    const sekarang = Date.now();

    if (cookieAktivitas) {
      const waktuTerakhir = parseInt(cookieAktivitas, 10);
      if (!isNaN(waktuTerakhir) && sekarang - waktuTerakhir > BATAS_INAKTIVITAS_MS) {
        // Sudah lewat 20 menit tanpa request baru -- paksa logout.
        await supabase.auth.signOut();
        supabaseResponse.cookies.delete(NAMA_COOKIE_AKTIVITAS);
        return supabaseResponse;
      }
    }

    // Masih dalam batas waktu (atau cookie belum pernah diset) --
    // catat request ini sebagai aktivitas terbaru.
    supabaseResponse.cookies.set(NAMA_COOKIE_AKTIVITAS, String(sekarang), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: BATAS_INAKTIVITAS_MS / 1000,
    });
  }

  // TIDAK ADA pengecekan "kalau belum login, redirect ke /login" di
  // sini -- lihat komentar di atas. Middleware ini murni refresh sesi
  // + inactivity check.

  return supabaseResponse;
}