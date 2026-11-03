/**
 * Gerbang rute (Next.js 16: proxy.ts menggantikan middleware.ts).
 *
 * Dashboard publik (Tamu boleh melihat) TIDAK dikunci. Gerbang ini hanya
 * mengalihkan ke /login untuk rute khusus petugas/admin bila cookie sesi
 * epic_sesi tidak ada. Ini pemeriksaan cepat (optimistic): keabsahan sesi,
 * masa aktif 25 menit, dan peran tetap divalidasi di server lewat
 * getPengguna() / lib/auth/guard.ts pada halaman dan route API.
 */
import { NextResponse, type NextRequest } from 'next/server';

const NAMA_COOKIE = 'epic_sesi'; // sama dengan NAMA_COOKIE di lib/auth/session.ts

const RUTE_TERLINDUNGI: RegExp[] = [
  /^\/admin(\/|$)/,
  /^\/dashboard\/peta\/kelola(\/|$)/,
  /^\/dashboard\/pengaturan-lokasi-karhutla(\/|$)/,
  /^\/dashboard\/pengawasan-klinik\/(tambah|klinik)(\/|$)/,
  /^\/dashboard\/global-emerging\/input(\/|$)/,
  /^\/dashboard\/posko\/[^/]+\/input(\/|$)/,
  /^\/lalu-lintas-orang\/input-penumpang-kapal(\/|$)/,
  /^\/dashboard\/input-data(\/|$)/,
  /^\/dashboard\/klinik\/input(\/|$)/,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!RUTE_TERLINDUNGI.some((re) => re.test(pathname))) return NextResponse.next();
  if (request.cookies.get(NAMA_COOKIE)?.value) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '?error=' + encodeURIComponent('Silakan login terlebih dahulu.');
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/peta/kelola/:path*',
    '/dashboard/pengaturan-lokasi-karhutla/:path*',
    '/dashboard/pengawasan-klinik/tambah/:path*',
    '/dashboard/pengawasan-klinik/klinik/:path*',
    '/dashboard/global-emerging/input/:path*',
    '/dashboard/posko/:jenis/input/:path*',
    '/lalu-lintas-orang/input-penumpang-kapal/:path*',
    '/dashboard/input-data/:path*',
    '/dashboard/klinik/input/:path*',
  ],
};
