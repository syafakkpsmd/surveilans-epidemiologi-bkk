/**
 * Melengkapi get-user-role.ts: `sudahLogin` (untuk fitur yang cukup "sudah login")
 * dan `role` (null bila belum login atau role tidak dikenal).
 * Satu pembacaan sesi per request lewat getPengguna() (React cache()).
 */
import { cache } from "react";
import { getPengguna } from "@/lib/auth/session";
import type { PeranUser } from "@/types/database.types";

export interface StatusAkses {
  sudahLogin: boolean;
  role: PeranUser | null;
}

export const getStatusAkses = cache(async (): Promise<StatusAkses> => {
  const p = await getPengguna();
  if (!p) return { sudahLogin: false, role: null };

  const role: PeranUser | null =
    p.role === "petugas" || p.role === "admin" || p.role === "petugas_klinik" || p.role === "tamu"
      ? (p.role as PeranUser)
      : null;

  return { sudahLogin: true, role };
});
