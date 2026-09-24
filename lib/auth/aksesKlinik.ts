// lib/auth/aksesKlinik.ts
import type { PeranUser } from "@/types/database.types";

export function bolehAksesTabelKlinik(role: PeranUser | null): boolean {
  return role === "admin" || role === "petugas_klinik";
}