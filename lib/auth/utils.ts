// lib/auth/utils.ts

/**
 * Normalisasi role agar sesuai dengan kontrak komponen TombolAnalisisAI.
 * Hanya mengizinkan 'admin' atau 'petugas'. Selain itu dianggap null.
 */
export function getValidRole(role: string | null | undefined): 'admin' | 'petugas' | null {
  if (role === 'admin' || role === 'petugas') {
    return role;
  }
  return null;
}