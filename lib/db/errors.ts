// lib/db/errors.ts
// Pengenal galat \"tabel belum ada\" (PostgreSQL: 42P01, pesan 'relation "x" does not exist'; SQLite/MariaDB lama tetap dikenali).
export function tabelTidakAda(pesan: string): boolean {
  return /no such table|doesn't exist|does not exist|ER_NO_SUCH_TABLE|42P01/i.test(pesan);
}

/** Galat pelanggaran UNIQUE/PRIMARY KEY (PostgreSQL SQLSTATE 23505; ER_DUP_ENTRY lama tetap dikenali). */
export function galatDuplikat(e: unknown): boolean {
  const x = e as { code?: string } | null | undefined;
  return x?.code === '23505' || x?.code === 'ER_DUP_ENTRY';
}
