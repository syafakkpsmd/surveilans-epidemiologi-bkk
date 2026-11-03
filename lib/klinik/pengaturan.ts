import { getDbClient } from '@/lib/db/client';

export async function getStandarHariVaksin(): Promise<number> {
  try {
    const { rows } = await getDbClient().execute(
      'SELECT standar_hari_vaksin FROM pengaturan_klinik WHERE id = 1 LIMIT 1'
    );
    return rows[0]?.standar_hari_vaksin ?? 14; // fallback aman kalau tabel kosong
  } catch {
    return 14;
  }
}