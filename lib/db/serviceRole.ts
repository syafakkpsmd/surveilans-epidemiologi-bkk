import 'server-only';

/**
 * PERINGATAN KERAS: klien ini MELEWATI SEMUA RLS (tanpa penjaga). JANGAN PERNAH:
 *   - Mengimpor file ini dari Client Component ('use client') atau komponen apa pun yang bisa ikut
 *     ke-bundle ke browser.
 *   - Mengirim hasil query lewat klien ini langsung ke response tanpa disaring -- terutama untuk tabel
 *     `pengaturan_ai` yang berisi `api_key`.
 *
 * HANYA dipakai dari kode server (Route Handler, Server Action, Server Component) yang memang butuh
 * membaca/menulis tabel dengan RLS tertutup, atau untuk operasi sistem/cron. Baris `import 'server-only'`
 * di atas membuat build GAGAL kalau file ini tidak sengaja ter-import ke kode client.
 */
import { buatKlienDb } from './query-builder';
import type { DbKlien } from './tipe';

export function createDbServiceClient(): DbKlien {
  return buatKlienDb() as unknown as DbKlien;
}
