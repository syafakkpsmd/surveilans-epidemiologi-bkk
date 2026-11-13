import "server-only";

// Role yang boleh melihat data jenazah. Sesuaikan: apakah petugas_klinik ikut?
const ROLE_BOLEH = new Set(["admin", "petugas"]);

export function bolehLihatJenazah(role?: string | null): boolean {
  return !!role && ROLE_BOLEH.has(role);
}