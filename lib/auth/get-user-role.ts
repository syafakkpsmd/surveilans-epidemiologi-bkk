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

import { cache } from 'react';
import { getAuthUser } from '@/lib/auth/getAuthUser';
import type { PeranUser } from '@/types/database.types';

export type PeranAkses = 'tamu' | PeranUser;

/**
 * Dibungkus React cache() supaya kalau fungsi ini dipanggil beberapa
 * kali dalam SATU request yang sama (mis. dari layout.tsx, Navbar,
 * DAN halaman itu sendiri sekaligus -- ini memang terjadi di banyak
 * halaman), Supabase cuma benar-benar dihubungi SEKALI. Tanpa ini,
 * tiap pemanggilan bikin round-trip auth.getUser() + query profiles
 * sendiri-sendiri -- selain lebih lambat, juga berisiko beda hasil
 * kalau ada race condition kecil di antara panggilan-panggilan itu
 * (salah satu bagian halaman bisa kebaca beda status login/role dari
 * bagian lain). cache() ini otomatis "reset" di setiap request baru,
 * jadi TIDAK menyebabkan status login basi antar-user/antar-request.
 *
 * Langkah auth.getUser()-nya sendiri lewat getAuthUser() (bersama
 * dengan getStatusAkses()) supaya round-trip ke server Auth yang
 * paling mahal juga cuma sekali, bukan cuma query profiles-nya saja.
 */
export const getUserRole = cache(async (): Promise<PeranAkses> => {
  const { user, supabase } = await getAuthUser();

  if (!user) {
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
});
