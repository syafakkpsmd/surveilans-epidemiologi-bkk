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

import { createClient } from "@/lib/supabase/server";
import type { PeranUser } from "@/types/database.types";

export interface StatusAkses {
  sudahLogin: boolean;
  role: PeranUser | null;
}

export async function getStatusAkses(): Promise<StatusAkses> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[DEBUG getStatusAkses] tidak ada user / authError:", authError);
    return { sudahLogin: false, role: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[DEBUG getStatusAkses] user.id =", user.id);
  console.log("[DEBUG getStatusAkses] profile =", profile);
  console.log("[DEBUG getStatusAkses] profileError =", profileError);

  const role: PeranUser | null =
    profile?.role === "petugas" || profile?.role === "admin" ? profile.role : null;

  return { sudahLogin: true, role };
}
