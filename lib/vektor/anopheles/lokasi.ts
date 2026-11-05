// lib/vektor/anopheles/lokasi.ts
// HANYA untuk server.
import 'server-only';
import { getDbClient } from '@/lib/db/client';
import type { Zona } from './config';

export const bersihNama = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const adaDuplikat = (e: any) => e?.code === '23505' || /duplicate key|unique constraint/i.test(String(e?.message));

export async function daftarLokasi(wilayah: string, zona: Zona) {
  const res = await getDbClient().execute({
    sql: `SELECT l.id, l.nama, COUNT(v.id)::int AS dipakai
          FROM vektor_anopheles_lokasi l
          LEFT JOIN vektor_anopheles v
            ON v.kode_wilker = l.kode_wilker AND v.zona = l.zona
           AND lower(btrim(v.sub_lokasi)) = lower(btrim(l.nama))
          WHERE l.kode_wilker = ? AND l.zona = ?
          GROUP BY l.id, l.nama
          ORDER BY lower(l.nama)`,
    args: [wilayah, zona],
  });
  return res.rows.map((r) => ({ id: Number(r.id), nama: String(r.nama), dipakai: Number(r.dipakai) }));
}

export async function tambahLokasi(wilayah: string, zona: Zona, nama: string): Promise<'ok' | 'duplikat'> {
  const res = await getDbClient().execute({
    sql: `INSERT INTO vektor_anopheles_lokasi (kode_wilker, zona, nama) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
    args: [wilayah, zona, nama],
  });
  return res.rowsAffected ? 'ok' : 'duplikat';
}

/** Ganti nama di daftar sekaligus di semua survei yang memakainya (satu pernyataan, atomik). */
export async function ubahLokasi(
  id: number,
  nama: string
): Promise<{ status: 'ok' | 'duplikat' | 'tidak_ada'; diubah: number }> {
  try {
    const res = await getDbClient().execute({
      sql: `WITH lama AS (
              SELECT kode_wilker, zona, nama FROM vektor_anopheles_lokasi WHERE id = ?
            ),
            m AS (UPDATE vektor_anopheles_lokasi SET nama = ? WHERE id = ? RETURNING id),
            d AS (
              UPDATE vektor_anopheles v SET sub_lokasi = ?
              FROM lama
              WHERE v.kode_wilker = lama.kode_wilker AND v.zona = lama.zona
                AND lower(btrim(v.sub_lokasi)) = lower(btrim(lama.nama))
              RETURNING v.id
            )
            SELECT (SELECT count(*) FROM m)::int AS ada, (SELECT count(*) FROM d)::int AS diubah`,
      args: [id, nama, id, nama],
    });
    const r = res.rows[0];
    if (!Number(r?.ada)) return { status: 'tidak_ada', diubah: 0 };
    return { status: 'ok', diubah: Number(r.diubah) };
  } catch (e) {
    if (adaDuplikat(e)) return { status: 'duplikat', diubah: 0 };
    throw e;
  }
}

/** Hanya menghapus dari daftar pilihan; survei yang sudah memakai nama ini tidak berubah. */
export async function hapusLokasi(id: number): Promise<boolean> {
  const res = await getDbClient().execute({ sql: `DELETE FROM vektor_anopheles_lokasi WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}