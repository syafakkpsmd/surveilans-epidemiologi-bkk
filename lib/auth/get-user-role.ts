/**
 * SERVER-ONLY. Panggil hanya dari Server Component / Server Action
 * (pakai createClient() dari lib/supabase/server.ts yang butuh
 * cookies()).
 *
 * Kembalian:
 *   'tamu'           -- belum login, ATAU login tapi tidak punya baris
 *                       valid di tabel `profiles` (fallback aman)
 *   'petugas'        -- login, profiles.role = 'petugas'
 *   'petugas_klinik' -- login, profiles.role = 'petugas_klinik'
 *   'admin'          -- login, profiles.role = 'admin'
 *
 * Catatan akses:
 * - 'admin', 'petugas', dan 'petugas_klinik' semuanya boleh menjalankan
 *   fitur "Analisis AI". Pengecekan di UI ada di bolehGenerate()
 *   (BoxAnalisisAI); route /api/analisis-ai harus memakai daftar role
 *   yang sama.
 * - Akses Tabel Klinik diatur terpisah di lib/auth/aksesKlinik.ts.
 * - Fitur kelola akun user tetap khusus 'admin'.
 *
 * Kalau user SUDAH login tapi belum punya baris di `profiles` (mis.
 * belum dibuatkan lewat Supabase Studio) atau role-nya bernilai tidak
 * dikenal, fungsi ini mengembalikan 'tamu' dan menulis warning ke log
 * server. Kondisi ini seharusnya tidak terjadi kalau onboarding user
 * rapi; kalau sering muncul, pertimbangkan membuat baris `profiles`
 * otomatis saat user dibuat.
 */

import { cache } from 'react';
import { getAuthUser } from '@/lib/auth/getAuthUser';

export type PeranAkses = 'admin' | 'petugas' | 'tamu' | 'petugas_klinik';

/** Role yang bisa tersimpan di profiles.role (semua kecuali 'tamu'). */
const ROLE_TERSIMPAN = ['admin', 'petugas', 'petugas_klinik'] as const;
type PeranTersimpan = (typeof ROLE_TERSIMPAN)[number];

function adalahPeranTersimpan(nilai: unknown): nilai is PeranTersimpan {
  return (
    typeof nilai === 'string' &&
    (ROLE_TERSIMPAN as readonly string[]).includes(nilai)
  );
}

/**
 * Dibungkus React cache() supaya kalau fungsi ini dipanggil beberapa
 * kali dalam SATU request yang sama (mis. dari layout.tsx, Navbar,
 * DAN halaman itu sendiri sekaligus), Supabase cuma benar-benar
 * dihubungi SEKALI. Tanpa ini, tiap pemanggilan bikin round-trip
 * auth.getUser() + query profiles sendiri-sendiri -- selain lebih
 * lambat, juga berisiko beda hasil kalau ada race condition kecil di
 * antara panggilan-panggilan itu. cache() otomatis "reset" di setiap
 * request baru, jadi TIDAK menyebabkan status login basi antar
 * user/antar request.
 *
 * Langkah auth.getUser()-nya sendiri lewat getAuthUser() (bersama
 * dengan getStatusAkses()) supaya round-trip ke server Auth yang
 * paling mahal juga cuma sekali.
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
    .maybeSingle();

  // Error sungguhan (koneksi, RLS, dsb.) -- bedakan dari "baris tidak ada".
  if (profileError) {
    console.error(
      `Gagal membaca profiles untuk user ${user.id}: ${profileError.message} -- diperlakukan sebagai 'tamu'.`
    );
    return 'tamu';
  }

  if (!profile) {
    console.warn(
      `User ${user.id} sudah login tapi belum punya baris di tabel profiles -- diperlakukan sebagai 'tamu'.`
    );
    return 'tamu';
  }

  if (!adalahPeranTersimpan(profile.role)) {
    console.warn(
      `User ${user.id} punya nilai role tidak dikenal ("${String(profile.role)}") di tabel profiles -- diperlakukan sebagai 'tamu'.`
    );
    return 'tamu';
  }

  return profile.role;
});