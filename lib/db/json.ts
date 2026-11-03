// Di MariaDB kolom JSON bertipe LONGTEXT, jadi mysql2 mengembalikannya sebagai string.
// Supabase (Postgres JSONB) dulu mengembalikan objek -- helper ini menyamakan perilakunya.

/** Ubah nilai menjadi string JSON untuk disimpan (null tetap null). */
export function keJson(nilai: unknown): string | null {
  return nilai === undefined || nilai === null ? null : JSON.stringify(nilai);
}

/** Parse kolom-kolom JSON pada satu baris; nilai yang bukan JSON valid dibiarkan apa adanya. */
export function parseKolomJson<T extends Record<string, any>>(baris: T, kolom: string[]): T {
  const hasil: Record<string, any> = { ...baris };
  for (const k of kolom) {
    const v = hasil[k];
    if (typeof v === 'string') {
      try { hasil[k] = JSON.parse(v); } catch { /* biarkan */ }
    }
  }
  return hasil as T;
}

/**
 * Kolom DATETIME diambil sebagai string 'YYYY-MM-DD HH:MM:SS' dalam UTC (koneksi memakai
 * time_zone +00:00). Tanpa 'T' dan 'Z', `new Date(...)` di browser menganggapnya waktu lokal
 * sehingga bergeser. Fungsi ini mengubahnya ke ISO 8601 UTC seperti yang dulu diberikan Supabase.
 */
export function keIsoUtc(nilai: unknown): string | null {
  if (typeof nilai !== 'string' || nilai === '') return null;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(nilai) ? nilai.replace(' ', 'T') + 'Z' : nilai;
}