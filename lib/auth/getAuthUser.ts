/**
 * Helper BERSAMA untuk getUserRole() (get-user-role.ts) dan
 * getStatusAkses() (getStatusAkses.ts) -- dua-duanya butuh hasil
 * supabase.auth.getUser() sebagai langkah pertama, tapi punya logika
 * fallback yang beda (lihat catatan masing-masing file). Supaya
 * panggilan auth.getUser() yang PALING MAHAL (round-trip nyata ke
 * server Auth Supabase, bukan sekadar baca cookie) cuma terjadi
 * SEKALI per request walau getUserRole() dan getStatusAkses()
 * dua-duanya dipanggil (mis. layout.tsx + Navbar + halaman itu
 * sendiri), dibungkus React cache() di sini.
 */
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error ? null : user, supabase };
});
