import { getDbClient } from '@/lib/db/client';

export async function tentukanTujuanLogin(role: string, userId: string): Promise<string> {
  if (role === 'poliklinik') {
    const { rows } = await getDbClient().execute({
      sql: `SELECT a.poliklinik_id::text AS id
              FROM poliklinik_non_bkk_akses a JOIN poliklinik_non_bkk p ON p.id = a.poliklinik_id
             WHERE a.user_id = ?::uuid AND p.aktif ORDER BY p.nama LIMIT 1`,
      args: [userId],
    });
    return rows[0] ? `/dashboard/poliklinik-non-bkk/${rows[0].id}` : '/dashboard/poliklinik-non-bkk';
  }
  return '/dashboard';
}