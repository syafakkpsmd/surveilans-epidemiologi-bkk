import { getDbClient } from '@/lib/db/client';

export interface Kapal {
  id: string;
  nama: string;
  wilker: string;
}

/** Daftar kapal per pelabuhan (satu kapal bisa muncul di beberapa pelabuhan). */
export async function getDaftarKapal(): Promise<Kapal[]> {
  const { rows } = await getDbClient().execute(
    `SELECT k.id::text AS id, k.nama, w.wilker
       FROM kapal k JOIN kapal_wilker w ON w.kapal_id = k.id
      WHERE k.aktif
      ORDER BY k.nama ASC`
  );
  return rows as Kapal[];
}

/** Tambah kapal ke pelabuhan. Bila nama sudah ada (tanpa melihat huruf besar/kecil), kapal yang ada dipakai ulang. */
export async function tambahKapal(nama: string, wilker: string): Promise<Kapal> {
  const db = getDbClient();
  const { rows } = await db.execute({
    sql: `INSERT INTO kapal (nama) VALUES (?)
          ON CONFLICT (lower(nama)) DO UPDATE SET aktif = true
          RETURNING id::text AS id, nama`,
    args: [nama],
  });
  const k = rows[0];
  await db.execute({
    sql: `INSERT INTO kapal_wilker (kapal_id, wilker) VALUES (?::uuid, ?) ON CONFLICT DO NOTHING`,
    args: [k.id, wilker],
  });
  return { id: k.id, nama: k.nama, wilker };
}