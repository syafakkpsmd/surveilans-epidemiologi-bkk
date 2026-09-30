// lib/auth/aksesLaluLintas.ts

import type { PeranUser } from "@/types/database.types";

/** Melihat dashboard Lalu Lintas Orang: publik, tidak perlu login sama sekali. */
export function bolehLihatLaluLintas(): boolean {
  return true;
}

/** Unduh Excel: Petugas, Petugas Klinik, atau Admin. Tamu/publik hanya bisa lihat. */
export function bolehUnduhLaluLintas(role: PeranUser | null): boolean {
  return role === "admin" || role === "petugas" || role === "petugas_klinik";
}