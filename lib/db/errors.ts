// lib/db/errors.ts
// Pengenal galat "tabel belum ada" untuk SQLite (pesan lama) maupun MariaDB ("Table 'db.x' doesn't exist").
export function tabelTidakAda(pesan: string): boolean {
  return /no such table|doesn't exist|ER_NO_SUCH_TABLE/i.test(pesan);
}
