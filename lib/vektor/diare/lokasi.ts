// lib/vektor/diare/lokasi.ts
// HANYA untuk server.
import 'server-only';
import { getDbClient } from '@/lib/db/client';
import type { Jenis } from './config';

export const bersihNama = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const adaDuplikat = (e: any) => e?.code === '23505' || /duplicate key|unique constraint/i.test(String(e?.message));

export async function daftarLokasi(jenis: Jenis, wilayah: string) {
  const res = await getDbClient().execute({
    sql: `SELECT l.id, l.nama, COUNT(v.id)::int AS dipakai
          FROM vektor_diare_lokasi l
          LEFT JOIN vektor_diare v
            ON v.jenis_kegiatan = l.jenis_kegiatan AND v.kode_wilker = l.kode_wilker
           AND lower(btrim(v.lokasi)) = lower(btrim(l.nama))
          WHERE l.jenis_kegiatan = ? AND l.kode_wilker = ?
          GROUP BY l.id, l.nama
          ORDER BY lower(l.nama)`,
    args: [jenis, wilayah],
  });
  return res.rows.map((r) => ({ id: Number(r.id), nama: String(r.nama), dipakai: Number(r.dipakai) }));
}

export async function tambahLokasi(jenis: Jenis, wilayah: string, nama: string): Promise<'ok' | 'duplikat'> {
  const res = await getDbClient().execute({
    sql: `INSERT INTO vektor_diare_lokasi (jenis_kegiatan, kode_wilker, nama)
          VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
    args: [jenis, wilayah, nama],
  });
  return res.rowsAffected ? 'ok' : 'duplikat';
}

export async function ubahLokasi(
  id: number,
  nama: string
): Promise<{ status: 'ok' | 'duplikat' | 'tidak_ada'; diubah: number }> {
  try {
    const res = await getDbClient().execute({
      sql: `WITH lama AS (
              SELECT jenis_kegiatan, kode_wilker, nama FROM vektor_diare_lokasi WHERE id = ?
            ),
            m AS (UPDATE vektor_diare_lokasi SET nama = ? WHERE id = ? RETURNING id),
            d AS (
              UPDATE vektor_diare v SET lokasi = ?
              FROM lama
              WHERE v.jenis_kegiatan = lama.jenis_kegiatan AND v.kode_wilker = lama.kode_wilker
                AND lower(btrim(v.lokasi)) = lower(btrim(lama.nama))
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
  const res = await getDbClient().execute({ sql: `DELETE FROM vektor_diare_lokasi WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}