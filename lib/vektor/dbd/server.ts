// lib/vektor/dbd/server.ts
// HANYA untuk server (route handler / server component).
import 'server-only';
import { getDbClient, type DbValue } from '@/lib/db/client';
import type { KamusWilker } from '@/lib/wilayah-kerja';

import { TINDAKAN_TIDAK, TINDAKAN_YA, bacaZona, type Zona } from './config';
import type { DataPengendalian, DataSurvei, KunciSurvei } from './validasi';
import { gabungkanSub, kanonikSub, rapikanSub } from './sublokasi';

const TGL = /^\d{4}-\d{2}-\d{2}$/;

// Survei dianggap sudah punya pengendalian bila ditandai Ya atau ada isian larvasida/fogging
// (sebagian data lama bertanda Tidak atau kosong tetapi berisi larvasida).
const ADA_PENGENDALIAN = `(tindakan_pengendalian = '${TINDAKAN_YA}' OR coalesce(larvasida_gram, 0) > 0
  OR coalesce(luas_wilayah_fogging_ha, 0) > 0 OR coalesce(jml_insektisida_fogging_ml, 0) > 0)`;

export type FilterDbd = {
  dari?: string; sampai?: string; wilayah?: string; zona?: Zona; subLokasi?: string; belumPengendalian?: boolean;
};

export function filterDariQuery(sp: URLSearchParams, wk: KamusWilker): FilterDbd {
  const f: FilterDbd = {};
  const dari = sp.get('dari');
  const sampai = sp.get('sampai');
  const wilayah = sp.get('wilayah');
  const zona = bacaZona(sp.get('zona'));
  if (dari && TGL.test(dari)) f.dari = dari;
  if (sampai && TGL.test(sampai)) f.sampai = sampai;
  if (wilayah && wk.isKode(wilayah)) f.wilayah = wilayah;
  if (zona) f.zona = zona;
  const sub = rapikanSub(sp.get('sub_lokasi'));
  if (sub) f.subLokasi = sub;
  if (sp.get('belum_pengendalian') === '1') f.belumPengendalian = true;
  return f;
}

function bangunWhere(f: FilterDbd) {
  const w: string[] = ['TRUE'];
  const p: DbValue[] = [];
  const tambah = (kondisi: string, nilai: DbValue) => (w.push(kondisi), p.push(nilai));
  if (f.dari) tambah('tgl_survei >= ?', f.dari);
  if (f.sampai) tambah('tgl_survei <= ?', f.sampai);
  if (f.wilayah) tambah('kode_wilker = ?', f.wilayah);
  if (f.zona) tambah('zona = ?', f.zona);
    if (f.subLokasi) tambah("lower(coalesce(btrim(sub_lokasi), '')) = lower(?)", f.subLokasi);
  if (f.belumPengendalian) w.push(`NOT ${ADA_PENGENDALIAN}`);
  return { where: w.join(' AND '), p };
}

const kunciBaris = (k: KunciSurvei) =>
  [k.tgl_survei, k.kode_wilker, k.zona, (k.sub_lokasi ?? '').toLowerCase()].join('|');

function tanpaDuplikat<T>(rows: T[], ambilKunci: (r: T) => string) {
  const lihat = new Set<string>();
  return rows.filter((r) => {
    const k = ambilKunci(r);
    if (lihat.has(k)) return false;
    lihat.add(k);
    return true;
  });
}

export async function daftarSurvei(f: FilterDbd, limit = 100, offset = 0) {
  const { where, p } = bangunWhere(f);
  const res = await getDbClient().execute({
    sql: `SELECT id, tgl_survei, kode_wilker, zona, sub_lokasi, jml_rumah_diperiksa, jml_positif_jentik,
                 container_diperiksa, container_positif, abj, hi, ci, bi, curah_hujan_mm,
                 tindakan_pengendalian, larvasida_gram, luas_wilayah_fogging_ha, jml_insektisida_fogging_ml,
                 ${ADA_PENGENDALIAN} AS ada_pengendalian
          FROM vektor_dbd WHERE ${where}
          ORDER BY tgl_survei DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 500), offset],
  });
  return res.rows;
}

/**
 * Daftar sub lokasi satu wilayah. Dengan `zona`: Perimeter = daftar tetap wilayah (wilker_ref.sub_lokasi: fasilitas
 * pelabuhan/bandara) + nama yang pernah dipakai di zona itu; Buffer = nama yang pernah dipakai di zona itu (RT dst.).
 */
export async function daftarSubLokasi(wilayah: string, zona?: Zona): Promise<string[]> {
  const db = getDbClient();
  const [data, tetap] = await Promise.all([
    db.execute({
      sql: `SELECT sub_lokasi AS nama FROM vektor_dbd
            WHERE kode_wilker = ?${zona ? ' AND zona = ?' : ''} AND sub_lokasi IS NOT NULL AND btrim(sub_lokasi) <> ''
              AND lower(btrim(sub_lokasi)) NOT IN ('buffer', 'perimeter')
            GROUP BY sub_lokasi`,
      args: zona ? [wilayah, zona] : [wilayah],
    }),
    !zona || zona === 'Perimeter'
      ? db.execute({ sql: `SELECT unnest(sub_lokasi) AS nama FROM wilker_ref WHERE kode = ?`, args: [wilayah] })
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);
  return gabungkanSub(tetap.rows.map((r) => String(r.nama)), data.rows.map((r) => String(r.nama)));
}

/** { WK01: { Perimeter: [...], Buffer: [...] }, ... }: untuk filter dasbor dan penyamaan penulisan saat menyimpan. */
export async function daftarSubLokasiPerZona(): Promise<Record<string, Record<Zona, string[]>>> {
  const db = getDbClient();
  const [data, tetap] = await Promise.all([
    db.execute(`SELECT DISTINCT kode_wilker AS kode, zona, sub_lokasi AS nama FROM vektor_dbd
                WHERE sub_lokasi IS NOT NULL AND btrim(sub_lokasi) <> '' AND zona IS NOT NULL
                  AND lower(btrim(sub_lokasi)) NOT IN ('buffer', 'perimeter')`),
    db.execute(`SELECT kode, unnest(sub_lokasi) AS nama FROM wilker_ref`),
  ]);
  const mentah: Record<string, Record<Zona, string[]>> = {};
  const ambil = (kode: string) => (mentah[kode] ??= { Perimeter: [], Buffer: [] });
  for (const r of tetap.rows) ambil(String(r.kode)).Perimeter.push(String(r.nama));
  for (const r of data.rows) {
    const z = bacaZona(r.zona);
    if (z) ambil(String(r.kode))[z].push(String(r.nama));
  }
  const hasil: Record<string, Record<Zona, string[]>> = {};
  for (const [kode, d] of Object.entries(mentah)) hasil[kode] = { Perimeter: gabungkanSub(d.Perimeter), Buffer: gabungkanSub(d.Buffer) };
  return hasil;
}

export interface WilayahSubLokasiDbd { kode: string; subLokasi: string[]; perZona: Record<Zona, string[]> }

/** Untuk FilterZonaSubLokasi: wilayah yang dicentang pada modul "vektor_sub_lokasi" beserta sub lokasinya per zona. */
export async function getWilayahSubLokasiDbd(kodeAktif: string[]): Promise<WilayahSubLokasiDbd[]> {
  const peta = await daftarSubLokasiPerZona();
  return kodeAktif
    .map((kode) => {
      const pz = peta[kode] ?? { Perimeter: [], Buffer: [] };
      return { kode, subLokasi: gabungkanSub(pz.Perimeter, pz.Buffer), perZona: pz };
    })
    .filter((w) => w.subLokasi.length > 0);
}

/** Samakan penulisan sub lokasi dengan yang sudah ada di wilayah + zona yang sama ("RT 1", "rt1", "RT 01" menjadi satu nama). */
async function kanonikanBaris<T extends { kode_wilker: string; zona: Zona; sub_lokasi: string | null }>(rows: T[]): Promise<T[]> {
  if (!rows.some((r) => r.sub_lokasi)) return rows;
  const peta = await daftarSubLokasiPerZona();
  const kerja: Record<string, string[]> = {}; // bertambah selama satu unggahan, supaya nama baru di berkas yang sama juga disamakan
  return rows.map((r) => {
    const daftar = (kerja[`${r.kode_wilker}|${r.zona}`] ??= [...(peta[r.kode_wilker]?.[r.zona] ?? [])]);
    const nama = kanonikSub(r.sub_lokasi, daftar);
    if (nama && !daftar.includes(nama)) daftar.push(nama);
    return { ...r, sub_lokasi: nama };
  });
}

// =====================================================================
// SURVEI
// =====================================================================

export async function simpanSurvei(rows: DataSurvei[]) {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const unik = tanpaDuplikat(await kanonikanBaris(rows), kunciBaris);
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `INSERT INTO vektor_dbd
              (tgl_survei, kode_wilker, zona, sub_lokasi, jml_rumah_diperiksa, jml_positif_jentik,
               container_diperiksa, container_positif, abj, hi, ci, bi, curah_hujan_mm, tindakan_pengendalian)
            SELECT x.t, x.w, x.z, x.sl, x.ru, x.rp, x.co, x.cp, x.abj, x.hi, x.ci, x.bi, x.hu, '${TINDAKAN_TIDAK}'
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::int[], ?::int[], ?::int[], ?::int[],
                        ?::numeric[], ?::numeric[], ?::numeric[], ?::numeric[], ?::numeric[])
                 AS x(t, w, z, sl, ru, rp, co, cp, abj, hi, ci, bi, hu)
            WHERE NOT EXISTS (
              SELECT 1 FROM vektor_dbd v
              WHERE v.tgl_survei = x.t AND v.kode_wilker = x.w AND v.zona = x.z
                AND lower(coalesce(btrim(v.sub_lokasi), '')) = lower(coalesce(x.sl, '')))`,
      args: [
        c.map((r) => r.tgl_survei),
        c.map((r) => r.kode_wilker),
        c.map((r) => r.zona),
        c.map((r) => r.sub_lokasi),
        c.map((r) => r.jml_rumah_diperiksa),
        c.map((r) => r.jml_positif_jentik),
        c.map((r) => r.container_diperiksa),
        c.map((r) => r.container_positif),
        c.map((r) => r.abj),
        c.map((r) => r.hi),
        c.map((r) => r.ci),
        c.map((r) => r.bi),
        c.map((r) => r.curah_hujan_mm),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function ubahSurvei(id: number, d0: DataSurvei): Promise<'ok' | 'duplikat' | 'tidak_ada'> {
  const [d] = await kanonikanBaris([d0]);
  const db = getDbClient();
  const kembar = await db.execute({
    sql: `SELECT 1 FROM vektor_dbd
          WHERE id <> ? AND tgl_survei = ? AND kode_wilker = ? AND zona = ?
            AND lower(coalesce(btrim(sub_lokasi), '')) = lower(?) LIMIT 1`,
    args: [id, d.tgl_survei, d.kode_wilker, d.zona, d.sub_lokasi ?? ''],
  });
  if (kembar.rows.length) return 'duplikat';

  // Kolom pengendalian sengaja tidak disentuh.
  const res = await db.execute({
    sql: `UPDATE vektor_dbd
          SET tgl_survei = ?, kode_wilker = ?, zona = ?, sub_lokasi = ?, jml_rumah_diperiksa = ?,
              jml_positif_jentik = ?, container_diperiksa = ?, container_positif = ?,
              abj = ?, hi = ?, ci = ?, bi = ?, curah_hujan_mm = ?
          WHERE id = ?`,
    args: [d.tgl_survei, d.kode_wilker, d.zona, d.sub_lokasi, d.jml_rumah_diperiksa, d.jml_positif_jentik,
           d.container_diperiksa, d.container_positif, d.abj, d.hi, d.ci, d.bi, d.curah_hujan_mm, id],
  });
  return res.rowsAffected ? 'ok' : 'tidak_ada';
}

export async function hapusSurvei(id: number): Promise<boolean> {
  const res = await getDbClient().execute({ sql: `DELETE FROM vektor_dbd WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}

// =====================================================================
// PENGENDALIAN (mengisi kolom pengendalian pada baris survei yang sudah ada)
// =====================================================================

export async function terapkanPengendalian(id: number, p: DataPengendalian): Promise<boolean> {
  const res = await getDbClient().execute({
    sql: `UPDATE vektor_dbd
          SET tindakan_pengendalian = '${TINDAKAN_YA}', larvasida_gram = ?, luas_wilayah_fogging_ha = ?,
              jml_insektisida_fogging_ml = ?
          WHERE id = ?`,
    args: [p.larvasida_gram, p.luas_wilayah_fogging_ha, p.jml_insektisida_fogging_ml, id],
  });
  return res.rowsAffected > 0;
}

export async function kosongkanPengendalian(id: number): Promise<boolean> {
  const res = await getDbClient().execute({
    sql: `UPDATE vektor_dbd
          SET tindakan_pengendalian = '${TINDAKAN_TIDAK}', larvasida_gram = NULL,
              luas_wilayah_fogging_ha = NULL, jml_insektisida_fogging_ml = NULL
          WHERE id = ?`,
    args: [id],
  });
  return res.rowsAffected > 0;
}

export type ItemPengendalian = { baris: number; kunci: KunciSurvei; pengendalian: DataPengendalian };

/** Untuk unggahan: cocokkan ke survei lewat tanggal + wilayah + zona + sub lokasi. */
export async function terapkanPengendalianBanyak(items0: ItemPengendalian[]) {
  const kunciKanonik = await kanonikanBaris(items0.map((it) => it.kunci));
  const items = items0.map((it, i) => ({ ...it, kunci: kunciKanonik[i] }));
  const unik = tanpaDuplikat(items, (it) => kunciBaris(it.kunci));
  const db = getDbClient();
  const ketemu = new Set<string>();
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `UPDATE vektor_dbd d
            SET tindakan_pengendalian = '${TINDAKAN_YA}', larvasida_gram = x.la,
                luas_wilayah_fogging_ha = x.lu, jml_insektisida_fogging_ml = x.ins
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::numeric[], ?::numeric[], ?::numeric[])
                 AS x(t, w, z, sl, la, lu, ins)
            WHERE d.tgl_survei = x.t AND d.kode_wilker = x.w AND d.zona = x.z
              AND lower(coalesce(btrim(d.sub_lokasi), '')) = lower(coalesce(x.sl, ''))
            RETURNING d.tgl_survei AS t, d.kode_wilker AS w, d.zona AS z,
                      lower(coalesce(btrim(d.sub_lokasi), '')) AS sl`,
      args: [
        c.map((it) => it.kunci.tgl_survei),
        c.map((it) => it.kunci.kode_wilker),
        c.map((it) => it.kunci.zona),
        c.map((it) => it.kunci.sub_lokasi),
        c.map((it) => it.pengendalian.larvasida_gram),
        c.map((it) => it.pengendalian.luas_wilayah_fogging_ha),
        c.map((it) => it.pengendalian.jml_insektisida_fogging_ml),
      ] as unknown as DbValue[],
    });
    for (const r of res.rows) ketemu.add(`${r.t}|${r.w}|${r.z}|${r.sl}`);
  }
  const tidakDitemukan = unik.filter((it) => !ketemu.has(kunciBaris(it.kunci))).map((it) => it.baris);
  return { diterapkan: unik.length - tidakDitemukan.length, tidakDitemukan };
}