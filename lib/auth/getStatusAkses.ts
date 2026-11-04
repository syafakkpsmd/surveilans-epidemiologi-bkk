import { cache } from "react";
import { getPengguna, PERAN_DIKENAL } from "@/lib/auth/session";
import type { PeranUser } from "@/types/database.types";

export interface StatusAkses {
  sudahLogin: boolean;
  role: PeranUser | null;
}

export const getStatusAkses = cache(async (): Promise<StatusAkses> => {
  const p = await getPengguna();
  if (!p) return { sudahLogin: false, role: null };

  // Daftar role diambil dari session.ts supaya otomatis ikut bila ada role baru.
  const role: PeranUser | null = (PERAN_DIKENAL as readonly string[]).includes(p.role)
    ? (p.role as PeranUser)
    : null;

  return { sudahLogin: true, role };
});