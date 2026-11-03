// SATU-SATUNYA berkas auth yang menyentuh lib/db/client.ts.
// Memakai klien PostgreSQL bersama (getDbClient). Placeholder `?` diubah otomatis menjadi $1, $2, ...
// SELECT / INSERT ... RETURNING mengembalikan baris; INSERT/UPDATE/DELETE biasa mengembalikan array kosong.
import { getDbClient } from "@/lib/db/client";
import type { DbValue } from "@/lib/db/client";

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const hasil = await getDbClient().execute({ sql: text, args: params as DbValue[] });
  return hasil.rows as T[];
}
