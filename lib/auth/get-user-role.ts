/**
 * SERVER-ONLY. Panggil hanya dari Server Component / Server Action
 * (pakai createClient() dari lib/supabase/server.ts yang butuh
 * cookies()).
 *
 * PENTING (lihat KONTEKS PROYEK): fungsi ini BUKAN untuk membedakan
 * akses dashboard atau fitur "Analisis AI" -- 'petugas' dan 'admin'
 * DIPERLAKUKAN SAMA untuk itu (cukup cek "sudah login atau belum"
 * lewat supabase.auth.getUser()). getUserRole() disediakan supaya
 * nanti fitur KELOLA AKUN USER (khusus Admin) bisa dibedakan.
 *
 * Kembalian:
 *   'tamu'    -- belum login sama sekali
 *   'petugas' -- login, dan ada baris di tabel `profiles` dengan role 'petugas'
 *   'admin'   -- login, dan ada baris di tabel `profiles` dengan role 'admin'
 *
 * Kalau user SUDAH login tapi belum punya baris di `profiles` (mis.
 * Admin belum sempat membuatkan lewat Supabase Studio), fungsi ini
 * mengembalikan 'tamu' sebagai fallback AMAN untuk fitur kelola user
 * -- meski secara teknis dia tetap dianggap "sudah login" oleh
 * supabase.auth.getUser() di tempat lain (mis. tombol Analisis AI
 * tetap aktif untuknya). Ini kondisi data yang seharusnya tidak
 * terjadi kalau proses onboarding user rapi; kalau sering terjadi,
 * pertimbangkan menambah baris `profiles` otomatis saat user dibuat.
 */

import { createClient } from '@/lib/supabase/server';
import type { PeranUser } from '@/types/database.types';

export type PeranAkses = 'tamu' | PeranUser;

export async function getUserRole(): Promise<PeranAkses> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return 'tamu';
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.warn(
      `User ${user.id} sudah login tapi belum punya baris di tabel profiles -- diperlakukan sebagai 'tamu' untuk fitur kelola user.`
    );
    return 'tamu';
  }

  if (profile.role !== 'petugas' && profile.role !== 'admin') {
    console.warn(
      `User ${user.id} punya nilai role tidak dikenal ("${profile.role}") di tabel profiles -- diperlakukan sebagai 'tamu' untuk fitur kelola user.`
    );
    return 'tamu';
  }

  return profile.role;
}
