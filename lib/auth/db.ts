// SATU-SATUNYA berkas auth yang menyentuh lib/db/client.ts.
// Memakai pool mysql2 dari getDbPool(). SELECT mengembalikan baris;
// INSERT/UPDATE/DELETE mengembalikan array kosong.
import { getDbPool } from "@/lib/db/client";

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const [hasil] = (await (getDbPool() as any).query(text, params)) as [unknown, unknown];
  return Array.isArray(hasil) ? (hasil as T[]) : [];
}