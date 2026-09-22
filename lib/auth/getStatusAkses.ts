/**
 * Melengkapi getUserRole.ts (JANGAN diubah -- tetap dipakai untuk
 * kebutuhan yang benar-benar butuh pembedaan role, mis. halaman kelola
 * user Admin di segmen mendatang).
 *
 * Fungsi ini menjawab kebutuhan berbeda: Navbar & TombolAnalisisAI
 * butuh DUA informasi terpisah dalam satu kali panggilan Supabase:
 *   1. sudahLogin -- untuk mengaktifkan fitur Analisis AI. Petugas
 *      MAUPUN Admin diperlakukan SAMA di sini (lihat KONTEKS PROYEK
 *      & catatan di getUserRole.ts): cukup "sudah login", TIDAK peduli
 *      apakah baris di `profiles` sudah dibuatkan atau belum.
 *   2. role -- HANYA dipakai untuk hal yang memang butuh beda Admin vs
 *      Petugas (mis. menampilkan ikon "Atur AI"), null kalau belum
 *      login ATAU sudah login tapi profil belum dibuatkan.
 *
 * Kalau langsung pakai getUserRole() untuk kebutuhan #1, user yang
 * sudah login tapi belum sempat dibuatkan baris profiles akan salah
 * kena kunci fitur AI-nya -- padahal seharusnya tidak.
 */

import { cache } from "react";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import type { PeranUser } from "@/types/database.types";

export interface StatusAkses {
  sudahLogin: boolean;
  role: PeranUser | null;
}

/**
 * Dibungkus React cache() -- alasan sama persis dengan getUserRole()
 * di get-user-role.ts (lihat komentar di sana): fungsi ini dipanggil
 * dari Navbar DAN dari halaman itu sendiri di banyak tempat (COP,
 * PHQC, dst) dalam satu request yang sama. Tanpa cache(), setiap
 * panggilan jadi round-trip auth.getUser() + query profiles sendiri
 * -- di beberapa halaman ini bisa terpanggil 2-3x per load, yang
 * ikut menyumbang rasa "lambat" saat navigasi/login.
 *
 * Langkah auth.getUser()-nya lewat getAuthUser() (bersama dengan
 * getUserRole()) supaya round-trip ke server Auth yang paling mahal
 * cuma sekali per request, walau dua-duanya dipanggil.
 */
export const getStatusAkses = cache(async (): Promise<StatusAkses> => {
  const { user, supabase } = await getAuthUser();

  if (!user) {
    return { sudahLogin: false, role: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role: PeranUser | null =
    profile?.role === "petugas" || profile?.role === "admin" ? profile.role : null;

  return { sudahLogin: true, role };
});
