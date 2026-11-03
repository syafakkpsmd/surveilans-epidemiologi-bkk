import { getDbClient } from '@/lib/db/client';
import { ITEM_CHECKLIST } from '@/lib/pengawasan-klinik/itemChecklist';
import { createDbClient } from '@/lib/db/server';


export async function pengawasanIdDariToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const r = await getDbClient().execute({
    sql: 'SELECT pengawasan_id FROM pengawasan_klinik_link_perbaikan WHERE token = ? AND aktif = 1',
    args: [token],
  });
  return (r.rows[0]?.pengawasan_id as string) ?? null;
}

/** Pengawasan + daftar item yang hasilnya "Tidak" */
export async function itemTidakSesuai(pengawasanId: string) {
  const supabase = await createDbClient();
  const { data } = await supabase
    .from('pengawasan_klinik')
    .select('*')
    .eq('id', pengawasanId)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, any>;
  return { pengawasan: row, items: ITEM_CHECKLIST.filter((i) => row[i.key] !== true) };
}

export type DataPerbaikan = Record<
  string,
  { keterangan: string | null; tanggal: string | null; foto: string[] }
>;

export async function ambilPerbaikan(pengawasanId: string): Promise<DataPerbaikan> {
  const r = await getDbClient().execute({
    sql: `SELECT p.item_key, p.keterangan, p.tanggal_perbaikan, f.id AS foto_id
          FROM pengawasan_klinik_perbaikan p
          LEFT JOIN pengawasan_klinik_perbaikan_foto f ON f.perbaikan_id = p.id
          WHERE p.pengawasan_id = ?
          ORDER BY f.diunggah_pada`,
    args: [pengawasanId],
  });
  const hasil: DataPerbaikan = {};
  for (const row of r.rows) {
    const key = row.item_key as string;
    hasil[key] ??= {
      keterangan: (row.keterangan as string) ?? null,
      tanggal: (row.tanggal_perbaikan as string) ?? null,
      foto: [],
    };
    if (row.foto_id) hasil[key].foto.push(row.foto_id as string);
  }
  return hasil;
}