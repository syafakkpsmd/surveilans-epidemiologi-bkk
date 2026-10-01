// lib/auth/aksesAI.ts
export const ROLE_BOLEH_JALANKAN_AI = ['admin', 'petugas', 'petugas_klinik'] as const;

export function bolehJalankanAI(role: string | null | undefined): boolean {
  return !!role && (ROLE_BOLEH_JALANKAN_AI as readonly string[]).includes(role);
}