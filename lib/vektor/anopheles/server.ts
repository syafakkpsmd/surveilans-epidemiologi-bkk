// lib/vektor/anopheles/server.ts
// HANYA untuk server (route handler / server component).
import 'server-only';
import { getDbClient, type DbValue } from '@/lib/db/client';
import type { KamusWilker } from '@/lib/wilayah-kerja';

import {
  CUACA, KEADAAN_TEMPAT, MACAM_TEMPAT, METODE_TANGKAP, TIPE_DB, bacaZona, type Tipe, type Zona,
} from './config';
import type { DataDewasa, DataLarva } from './validasi';

const TGL = /^\d{4}-\d{2}-\d{2}$/;

export type FilterAnopheles = { tipe: Tipe; dari?: string; sampai?: string; wilayah?: string; zona?: Zona };

export function filterDariQuery(sp: URLSearchParams, wk: KamusWilker): FilterAnopheles | null {
  const tipe = sp.get('tipe');
  if (tipe !== 'larva' && tipe !== 'dewasa') return null;
  const f: FilterAnopheles = { tipe };
  const dari = sp.get('dari');
  const sampai = sp.get('sampai');
  const wilayah = sp.get('wilayah');
  const zona = sp.get('zona');
  if (dari && TGL.test(dari)) f.dari = dari;
  if (sampai && TGL.test(sampai)) f.sampai = sampai;
  if (wilayah && wk.isKode(wilayah)) f.wilayah = wilayah;
  if (zona && bacaZona(zona)) f.zona = bacaZona(zona)!;
  return f;
}

function bangunWhere(f: FilterAnopheles) {
  const w: string[] = ['tipe_pengamatan = ?'];
  const p: DbValue[] = [TIPE_DB[f.tipe]];
  const tambah = (kondisi: string, nilai: DbValue) => (w.push(kondisi), p.push(nilai));
  if (f.dari) tambah('tgl_survei >= ?', f.dari);
  if (f.sampai) tambah('tgl_survei <= ?', f.sampai);
  if (f.wilayah) tambah('kode_wilker = ?', f.wilayah);
  if (f.zona) tambah('zona = ?', f.zona);
  return { where: w.join(' AND '), p };
}

function tanpaDuplikat<T>(rows: T[], ambilKunci: (r: T) => string) {
  const lihat = new Set<string>();
  return rows.filter((r) => {
    const k = ambilKunci(r);
    if (lihat.has(k)) return false;
    lihat.add(k);
    return true;
  });
}

// Dianggap duplikat bila tanggal, wilayah, zona, lokasi, dan angka utamanya sama persis.
const kunciLarva = (r: DataLarva) =>
  [r.tgl_survei, r.kode_wilker, r.zona, (r.sub_lokasi ?? '').toLowerCase(), r.macam_tempat_perindukan.toLowerCase(),
   r.jumlah_cidukan, r.jumlah_larva].join('|');
const kunciDewasa = (r: DataDewasa) =>
  [r.tgl_survei, r.kode_wilker, r.zona, (r.sub_lokasi ?? '').toLowerCase(), r.metode_tangkap.toLowerCase(),
   r.jml_nyamuk, r.jml_jam_tangkap].join('|');

export async function daftarSurvei(f: FilterAnopheles, limit = 100, offset = 0) {
  const { where, p } = bangunWhere(f);
  const res = await getDbClient().execute({
    sql: `SELECT id, tgl_survei, kode_wilker, zona, sub_lokasi, fase_bulan, suhu_c, kelembapan_pct, cuaca,
                 metode_tangkap, jml_nyamuk, jml_petugas, jml_jam_tangkap, mbr, mhd, spesies,
                 jumlah_cidukan, jumlah_larva, jumlah_jenis_larva, spesies_larva,
                 macam_tempat_perindukan, keadaan_tempat_perindukan
          FROM vektor_anopheles WHERE ${where}
          ORDER BY tgl_survei DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 500), offset],
  });
  return res.rows;
}

// =====================================================================
// LARVA  (jumlah larva dan jenis larva bernilai 0 disimpan NULL, mengikuti data yang ada)
// =====================================================================

export async function simpanLarva(rows: DataLarva[]) {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const unik = tanpaDuplikat(rows, kunciLarva);
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `INSERT INTO vektor_anopheles
              (tgl_survei, kode_wilker, zona, tipe_pengamatan, sub_lokasi, fase_bulan, suhu_c, kelembapan_pct, cuaca,
               jumlah_cidukan, jumlah_larva, jumlah_jenis_larva, spesies_larva,
               macam_tempat_perindukan, keadaan_tempat_perindukan)
            SELECT x.t, x.w, x.z, '${TIPE_DB.larva}', x.sl, x.fb, x.su, x.kl, x.cu,
                   x.ci, NULLIF(x.la, 0), NULLIF(x.je, 0), x.sp, x.ma, x.ke
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::text[], ?::numeric[], ?::numeric[], ?::text[],
                        ?::int[], ?::int[], ?::int[], ?::text[], ?::text[], ?::text[])
                 AS x(t, w, z, sl, fb, su, kl, cu, ci, la, je, sp, ma, ke)
            WHERE NOT EXISTS (
              SELECT 1 FROM vektor_anopheles v
              WHERE v.tipe_pengamatan = '${TIPE_DB.larva}' AND v.tgl_survei = x.t AND v.kode_wilker = x.w
                AND v.zona = x.z AND lower(coalesce(btrim(v.sub_lokasi), '')) = lower(coalesce(x.sl, ''))
                AND lower(coalesce(v.macam_tempat_perindukan, '')) = lower(x.ma)
                AND v.jumlah_cidukan = x.ci AND coalesce(v.jumlah_larva, 0) = x.la)`,
      args: [
        c.map((r) => r.tgl_survei),
        c.map((r) => r.kode_wilker),
        c.map((r) => r.zona),
        c.map((r) => r.sub_lokasi),
        c.map((r) => r.fase_bulan),
        c.map((r) => r.suhu_c),
        c.map((r) => r.kelembapan_pct),
        c.map((r) => r.cuaca),
        c.map((r) => r.jumlah_cidukan),
        c.map((r) => r.jumlah_larva),
        c.map((r) => r.jumlah_jenis_larva ?? 0),
        c.map((r) => r.spesies_larva),
        c.map((r) => r.macam_tempat_perindukan),
        c.map((r) => r.keadaan_tempat_perindukan),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function ubahLarva(id: number, d: DataLarva): Promise<'ok' | 'duplikat' | 'tidak_ada'> {
  const db = getDbClient();
  const kembar = await db.execute({
    sql: `SELECT 1 FROM vektor_anopheles
          WHERE id <> ? AND tipe_pengamatan = '${TIPE_DB.larva}' AND tgl_survei = ? AND kode_wilker = ? AND zona = ?
            AND lower(coalesce(btrim(sub_lokasi), '')) = lower(?)
            AND lower(coalesce(macam_tempat_perindukan, '')) = lower(?)
            AND jumlah_cidukan = ? AND coalesce(jumlah_larva, 0) = ? LIMIT 1`,
    args: [id, d.tgl_survei, d.kode_wilker, d.zona, d.sub_lokasi ?? '', d.macam_tempat_perindukan,
           d.jumlah_cidukan, d.jumlah_larva],
  });
  if (kembar.rows.length) return 'duplikat';

  const res = await db.execute({
    sql: `UPDATE vektor_anopheles
          SET tgl_survei = ?, kode_wilker = ?, zona = ?, sub_lokasi = ?, fase_bulan = ?, suhu_c = ?,
              kelembapan_pct = ?, cuaca = ?, jumlah_cidukan = ?, jumlah_larva = NULLIF(?::int, 0),
              jumlah_jenis_larva = NULLIF(?::int, 0), spesies_larva = ?, macam_tempat_perindukan = ?,
              keadaan_tempat_perindukan = ?
          WHERE id = ? AND tipe_pengamatan = '${TIPE_DB.larva}'`,
    args: [d.tgl_survei, d.kode_wilker, d.zona, d.sub_lokasi, d.fase_bulan, d.suhu_c, d.kelembapan_pct, d.cuaca,
           d.jumlah_cidukan, d.jumlah_larva, d.jumlah_jenis_larva ?? 0, d.spesies_larva,
           d.macam_tempat_perindukan, d.keadaan_tempat_perindukan, id],
  });
  return res.rowsAffected ? 'ok' : 'tidak_ada';
}

// =====================================================================
// DEWASA
// =====================================================================

export async function simpanDewasa(rows: DataDewasa[]) {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const unik = tanpaDuplikat(rows, kunciDewasa);
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `INSERT INTO vektor_anopheles
              (tgl_survei, kode_wilker, zona, tipe_pengamatan, sub_lokasi, fase_bulan, suhu_c, kelembapan_pct, cuaca,
               metode_tangkap, jml_nyamuk, jml_petugas, jml_jam_tangkap, mbr, mhd, spesies)
            SELECT x.t, x.w, x.z, '${TIPE_DB.dewasa}', x.sl, x.fb, x.su, x.kl, x.cu,
                   x.me, x.ny, x.pe, x.ja, x.mbr, x.mhd, x.sp
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::text[], ?::numeric[], ?::numeric[], ?::text[],
                        ?::text[], ?::int[], ?::int[], ?::numeric[], ?::numeric[], ?::numeric[], ?::text[])
                 AS x(t, w, z, sl, fb, su, kl, cu, me, ny, pe, ja, mbr, mhd, sp)
            WHERE NOT EXISTS (
              SELECT 1 FROM vektor_anopheles v
              WHERE v.tipe_pengamatan = '${TIPE_DB.dewasa}' AND v.tgl_survei = x.t AND v.kode_wilker = x.w
                AND v.zona = x.z AND lower(coalesce(btrim(v.sub_lokasi), '')) = lower(coalesce(x.sl, ''))
                AND lower(coalesce(v.metode_tangkap, '')) = lower(x.me)
                AND v.jml_nyamuk = x.ny AND v.jml_jam_tangkap = x.ja)`,
      args: [
        c.map((r) => r.tgl_survei),
        c.map((r) => r.kode_wilker),
        c.map((r) => r.zona),
        c.map((r) => r.sub_lokasi),
        c.map((r) => r.fase_bulan),
        c.map((r) => r.suhu_c),
        c.map((r) => r.kelembapan_pct),
        c.map((r) => r.cuaca),
        c.map((r) => r.metode_tangkap),
        c.map((r) => r.jml_nyamuk),
        c.map((r) => r.jml_petugas),
        c.map((r) => r.jml_jam_tangkap),
        c.map((r) => r.mbr),
        c.map((r) => r.mhd),
        c.map((r) => r.spesies),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function ubahDewasa(id: number, d: DataDewasa): Promise<'ok' | 'duplikat' | 'tidak_ada'> {
  const db = getDbClient();
  const kembar = await db.execute({
    sql: `SELECT 1 FROM vektor_anopheles
          WHERE id <> ? AND tipe_pengamatan = '${TIPE_DB.dewasa}' AND tgl_survei = ? AND kode_wilker = ? AND zona = ?
            AND lower(coalesce(btrim(sub_lokasi), '')) = lower(?)
            AND lower(coalesce(metode_tangkap, '')) = lower(?)
            AND jml_nyamuk = ? AND jml_jam_tangkap = ? LIMIT 1`,
    args: [id, d.tgl_survei, d.kode_wilker, d.zona, d.sub_lokasi ?? '', d.metode_tangkap, d.jml_nyamuk, d.jml_jam_tangkap],
  });
  if (kembar.rows.length) return 'duplikat';

    const res = await db.execute({
        sql: `UPDATE vektor_anopheles
            SET tgl_survei = ?, kode_wilker = ?, zona = ?, sub_lokasi = ?, fase_bulan = ?, suhu_c = ?,
                kelembapan_pct = ?, cuaca = ?, metode_tangkap = ?, jml_nyamuk = ?, jml_petugas = ?,
                jml_jam_tangkap = ?, mbr = ?, mhd = ?, spesies = ?
            WHERE id = ? AND tipe_pengamatan = '${TIPE_DB.dewasa}'`,
        args: [d.tgl_survei, d.kode_wilker, d.zona, d.sub_lokasi, d.fase_bulan, d.suhu_c, d.kelembapan_pct, d.cuaca,
            d.metode_tangkap, d.jml_nyamuk, d.jml_petugas, d.jml_jam_tangkap, d.mbr, d.mhd, d.spesies, id],
    });
  return res.rowsAffected ? 'ok' : 'tidak_ada';
}

export async function hapusSurvei(id: number, tipe: Tipe): Promise<boolean> {
  const res = await getDbClient().execute({
    sql: `DELETE FROM vektor_anopheles WHERE id = ? AND tipe_pengamatan = ?`,
    args: [id, TIPE_DB[tipe]],
  });
  return res.rowsAffected > 0;
}

// =====================================================================
// SARAN ISIAN (daftar baku + nilai yang sudah pernah dipakai di data)
// =====================================================================

function gabung(baku: readonly string[], dariDb: string[]) {
  const hasil = [...baku];
  for (const v of dariDb) if (!hasil.some((h) => h.toLowerCase() === v.toLowerCase())) hasil.push(v);
  return hasil;
}

export async function ambilOpsi() {
  const nonKosong = (kol: string) => `${kol} IS NOT NULL AND btrim(${kol}) <> ''`;
  const res = await getDbClient().execute({
    sql: `SELECT 'metode' AS k, metode_tangkap AS v, count(*)::int AS n FROM vektor_anopheles WHERE ${nonKosong('metode_tangkap')} GROUP BY 2
          UNION ALL SELECT 'spesies', spesies, count(*)::int FROM vektor_anopheles WHERE ${nonKosong('spesies')} GROUP BY 2
          UNION ALL SELECT 'spesies_larva', spesies_larva, count(*)::int FROM vektor_anopheles WHERE ${nonKosong('spesies_larva')} GROUP BY 2
          UNION ALL SELECT 'macam', macam_tempat_perindukan, count(*)::int FROM vektor_anopheles WHERE ${nonKosong('macam_tempat_perindukan')} GROUP BY 2
          UNION ALL SELECT 'keadaan', keadaan_tempat_perindukan, count(*)::int FROM vektor_anopheles WHERE ${nonKosong('keadaan_tempat_perindukan')} GROUP BY 2
          UNION ALL SELECT 'cuaca', cuaca, count(*)::int FROM vektor_anopheles WHERE ${nonKosong('cuaca')} GROUP BY 2
          ORDER BY 1, 3 DESC`,
    args: [],
  });
  const per: Record<string, string[]> = {};
  for (const r of res.rows) (per[String(r.k)] ??= []).push(String(r.v));
  return {
    metode: gabung(METODE_TANGKAP, per.metode ?? []),
    spesies: per.spesies ?? [],
    spesiesLarva: per.spesies_larva ?? [],
    macam: gabung(MACAM_TEMPAT, per.macam ?? []),
    keadaan: gabung(KEADAAN_TEMPAT, per.keadaan ?? []),
    cuaca: gabung(CUACA, per.cuaca ?? []),
  };
}