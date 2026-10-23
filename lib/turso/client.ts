// SEMENTARA (migrasi MariaDB): nama lama dipertahankan agar 27 file pemanggil tidak perlu
// diganti sekaligus. Isinya kini klien MariaDB (lib/db/client.ts), bukan Turso.
// Setelah migrasi selesai, ganti nama `getTursoClient` -> `getDbClient` di semua file lalu hapus berkas ini.
export { getDbClient as getTursoClient } from '@/lib/db/client';