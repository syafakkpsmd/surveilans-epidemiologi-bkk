/**
 * CATATAN: kalau Segmen 1 sudah membuat middleware.ts dengan isi yang
 * berbeda (mis. ada blok redirect ke /login berdasarkan sesi), GANTI
 * isinya dengan versi ini -- sesuai KONTEKS PROYEK, dashboard tidak
 * boleh dikunci untuk Tamu. Kalau versi Segmen 1 sudah persis seperti
 * ini (hanya panggil updateSession, tanpa redirect), tidak perlu
 * diubah.
 */

import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Jalankan middleware di semua path KECUALI file statis Next.js
     * dan aset gambar, supaya tidak boros refresh sesi untuk aset.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};