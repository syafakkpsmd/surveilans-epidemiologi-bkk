// lib/vektor/tikus/server.ts
// HANYA untuk server (route handler / server component).
import 'server-only';
import { getDbClient, type DbValue } from '@/lib/db/client';

import { AREA_SURVEI, JENIS_TRAP, SPESIES, type KodeSpesies } from './config';
import type { DataLab, DataSurveiTikus } from './validasi';

const TGL = /^\d{4}-\d{2}-\d{2}$/;
const KODE_SPESIES: string[] = SPESIES.map((s) => s.kode);
const angka = (v: unknown) => Number(v ?? 0);


export type FilterTikus = {
  dari?: string;
  sampai?: string;
  wilayah?: string;
  spesies?: KodeSpesies; // khusus lab
  adaPositif?: boolean; // khusus lab
};

export function filterDariQuery(sp: URLSearchParams): FilterTikus {
  const f: FilterTikus = {};
  const dari = sp.get('dari');
  const sampai = sp.get('sampai');
  const wilayah = sp.get('wilayah');
  const spesies = sp.get('spesies');
  if (dari && TGL.test(dari)) f.dari = dari;
  if (sampai && TGL.test(sampai)) f.sampai = sampai;
  if (wilayah && wk.isKode(wilayah)) f.wilayah = wilayah;
  if (spesies && KODE_SPESIES.includes(spesies)) f.spesies = spesies as KodeSpesies;
  if (sp.get('positif') === '1') f.adaPositif = true;
  return f;
}

function bangunWhere(f: FilterTikus, kolomTgl: string, lab: boolean) {
  const w: string[] = ['TRUE'];
  const p: DbValue[] = [];
  const tambah = (kondisi: string, nilai: DbValue) => (w.push(kondisi), p.push(nilai));
  if (f.dari) tambah(`${kolomTgl} >= ?`, f.dari);
  if (f.sampai) tambah(`${kolomTgl} <= ?`, f.sampai);
  if (f.wilayah) tambah('kode_wilker = ?', f.wilayah);
  if (lab && f.spesies) tambah('nama_tikus = ?', f.spesies);
  if (lab && f.adaPositif) w.push(`'Positif' IN (hasil_leptospira, hasil_pes, hasil_hantavirus)`);
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

const adaDuplikat = (e: any) => e?.code === '23505' || /duplicate key|unique constraint/i.test(String(e?.message));

// =====================================================================
// SURVEI (tabel vektor_tikus)
// =====================================================================

// Dianggap duplikat bila tanggal, wilayah, dan seluruh angka pengamatan sama persis.
const kunciSurvei = (r: DataSurveiTikus) =>
  [r.tgl_survei, r.kode_wilker, r.jml_trap_dipasang, r.rt, r.rn, r.mm, r.jenis_lainnya, r.jml_pinjal_ditemukan].join('|');

export async function daftarSurveiTikus(f: FilterTikus, limit = 100, offset = 0) {
  const { where, p } = bangunWhere(f, 'tgl_survei', false);
  const res = await getDbClient().execute({
    sql: `SELECT id, tgl_survei, kode_wilker, jml_trap_dipasang, rt, rn, mm, jenis_lainnya, jml_trap_tertangkap,
                 tsi, jml_pinjal_ditemukan, index_pinjal, keterangan,
                 ((uji_lab IS NOT NULL AND uji_lab <> '') OR hasil_leptospira IS NOT NULL OR hasil_pes IS NOT NULL
                   OR hasil_hantavirus IS NOT NULL
                   OR COALESCE(jumlah_positif_leptospira, 0) + COALESCE(jumlah_positif_pes, 0)
                      + COALESCE(jumlah_positif_hantavirus, 0) > 0) AS lab_lama
          FROM vektor_tikus WHERE ${where}
          ORDER BY tgl_survei DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 500), offset],
  });
  return res.rows;
}

export async function simpanSurveiTikus(rows: DataSurveiTikus[], oleh: string) {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const unik = tanpaDuplikat(rows, kunciSurvei);
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `INSERT INTO vektor_tikus
              (tgl_survei, kode_wilker, area_survei, jenis_trap, jml_trap_dipasang, rt, rn, mm, jenis_lainnya,
               jml_trap_tertangkap, tsi, jml_pinjal_ditemukan, index_pinjal, keterangan, input_oleh)
            SELECT x.t, x.w, ?::text, ?::text, x.d, x.rt, x.rn, x.mm, x.l, x.tk, x.tsi, x.p, x.ip, x.k, ?::text
            FROM unnest(?::date[], ?::text[], ?::int[], ?::int[], ?::int[], ?::int[], ?::int[], ?::int[],
                        ?::numeric[], ?::int[], ?::numeric[], ?::text[])
                 AS x(t, w, d, rt, rn, mm, l, tk, tsi, p, ip, k)
            WHERE NOT EXISTS (
              SELECT 1 FROM vektor_tikus v
              WHERE v.tgl_survei = x.t AND v.kode_wilker = x.w AND v.jml_trap_dipasang = x.d
                AND COALESCE(v.rt, 0) = x.rt AND COALESCE(v.rn, 0) = x.rn AND COALESCE(v.mm, 0) = x.mm
                AND COALESCE(v.jenis_lainnya, 0) = x.l AND COALESCE(v.jml_pinjal_ditemukan, 0) = x.p)`,
      args: [
        AREA_SURVEI,
        JENIS_TRAP,
        oleh,
        c.map((r) => r.tgl_survei),
        c.map((r) => r.kode_wilker),
        c.map((r) => r.jml_trap_dipasang),
        c.map((r) => r.rt),
        c.map((r) => r.rn),
        c.map((r) => r.mm),
        c.map((r) => r.jenis_lainnya),
        c.map((r) => r.jml_trap_tertangkap),
        c.map((r) => r.tsi),
        c.map((r) => r.jml_pinjal_ditemukan),
        c.map((r) => r.index_pinjal),
        c.map((r) => r.keterangan),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function ubahSurveiTikus(id: number, d: DataSurveiTikus): Promise<'ok' | 'duplikat' | 'tidak_ada'> {
  const db = getDbClient();
  const kembar = await db.execute({
    sql: `SELECT 1 FROM vektor_tikus
          WHERE id <> ? AND tgl_survei = ? AND kode_wilker = ? AND jml_trap_dipasang = ?
            AND COALESCE(rt, 0) = ? AND COALESCE(rn, 0) = ? AND COALESCE(mm, 0) = ?
            AND COALESCE(jenis_lainnya, 0) = ? AND COALESCE(jml_pinjal_ditemukan, 0) = ? LIMIT 1`,
    args: [id, d.tgl_survei, d.kode_wilker, d.jml_trap_dipasang, d.rt, d.rn, d.mm, d.jenis_lainnya, d.jml_pinjal_ditemukan],
  });
  if (kembar.rows.length) return 'duplikat';

  // Kolom lab lama (uji_lab, hasil_*, jumlah_positif_*) sengaja tidak disentuh.
  const res = await db.execute({
    sql: `UPDATE vektor_tikus
          SET tgl_survei = ?, kode_wilker = ?, jml_trap_dipasang = ?, rt = ?, rn = ?, mm = ?, jenis_lainnya = ?,
              jml_trap_tertangkap = ?, tsi = ?, jml_pinjal_ditemukan = ?, index_pinjal = ?, keterangan = ?
          WHERE id = ?`,
    args: [
      d.tgl_survei, d.kode_wilker, d.jml_trap_dipasang, d.rt, d.rn, d.mm, d.jenis_lainnya,
      d.jml_trap_tertangkap, d.tsi, d.jml_pinjal_ditemukan, d.index_pinjal, d.keterangan, id,
    ],
  });
  return res.rowsAffected ? 'ok' : 'tidak_ada';
}

export async function hapusSurveiTikus(id: number): Promise<boolean> {
  const res = await getDbClient().execute({ sql: `DELETE FROM vektor_tikus WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}

// =====================================================================
// HASIL LAB (tabel vektor_tikus_lab, satu baris per ekor tikus)
// =====================================================================

const kunciLab = (r: DataLab) =>
  [
    r.tgl_periksa, r.kode_wilker, r.nama_tikus, r.lokasi_pemasangan.toLowerCase(),
    r.hasil_leptospira ?? '', r.hasil_pes ?? '', r.hasil_hantavirus ?? '', (r.kode_sampel ?? '').toLowerCase(),
  ].join('|');

export async function daftarLab(f: FilterTikus, limit = 100, offset = 0) {
  const { where, p } = bangunWhere(f, 'tgl_periksa', true);
  const res = await getDbClient().execute({
    sql: `SELECT id, tgl_periksa, kode_wilker, nama_tikus, lokasi_pemasangan, kode_sampel,
                 hasil_leptospira, hasil_pes, hasil_hantavirus, keterangan
          FROM vektor_tikus_lab WHERE ${where}
          ORDER BY tgl_periksa DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 500), offset],
  });
  return res.rows;
}

/**
 * Untuk unggahan: baris yang identik dengan yang sudah ada di database dilewati satu per satu
 * (selisih jumlah), jadi mengunggah file yang sama dua kali tidak menggandakan data, sementara
 * beberapa ekor tikus yang kebetulan identik di file yang sama tetap masuk semua.
 */
async function buangYangSudahAda(rows: DataLab[]): Promise<DataLab[]> {
  const pasangan = Array.from(new Map(rows.map((r) => [`${r.tgl_periksa}|${r.kode_wilker}`, r])).values());
  const res = await getDbClient().execute({
    sql: `SELECT tgl_periksa AS t, kode_wilker AS w, nama_tikus AS n, lower(btrim(lokasi_pemasangan)) AS l,
                 COALESCE(hasil_leptospira, '') AS hl, COALESCE(hasil_pes, '') AS hp,
                 COALESCE(hasil_hantavirus, '') AS hh, lower(COALESCE(kode_sampel, '')) AS s, COUNT(*)::int AS jml
          FROM vektor_tikus_lab
          WHERE (tgl_periksa, kode_wilker) IN (SELECT a, b FROM unnest(?::date[], ?::text[]) AS y(a, b))
          GROUP BY 1, 2, 3, 4, 5, 6, 7, 8`,
    args: [pasangan.map((r) => r.tgl_periksa), pasangan.map((r) => r.kode_wilker)] as unknown as DbValue[],
  });
  const sisa = new Map<string, number>();
  for (const r of res.rows) sisa.set(`${r.t}|${r.w}|${r.n}|${r.l}|${r.hl}|${r.hp}|${r.hh}|${r.s}`, angka(r.jml));

  const baru: DataLab[] = [];
  for (const r of rows) {
    const k = kunciLab(r);
    const n = sisa.get(k) ?? 0;
    if (n > 0) sisa.set(k, n - 1);
    else baru.push(r);
  }
  return baru;
}

export async function simpanLab(rows: DataLab[], oleh: string, dariUnggahan = false) {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const calon = dariUnggahan ? await buangYangSudahAda(rows) : rows;
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < calon.length; i += 500) {
    const c = calon.slice(i, i + 500);
    // ON CONFLICT DO NOTHING menjaga kode sampel yang sama (indeks unik parsial).
    const res = await db.execute({
      sql: `INSERT INTO vektor_tikus_lab
              (tgl_periksa, kode_wilker, nama_tikus, lokasi_pemasangan, kode_sampel,
               hasil_leptospira, hasil_pes, hasil_hantavirus, keterangan, input_oleh)
            SELECT x.t, x.w, x.n, x.l, x.s, x.hl, x.hp, x.hh, x.k, ?::text
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[])
                 AS x(t, w, n, l, s, hl, hp, hh, k)
            ON CONFLICT DO NOTHING`,
      args: [
        oleh,
        c.map((r) => r.tgl_periksa),
        c.map((r) => r.kode_wilker),
        c.map((r) => r.nama_tikus),
        c.map((r) => r.lokasi_pemasangan),
        c.map((r) => r.kode_sampel),
        c.map((r) => r.hasil_leptospira),
        c.map((r) => r.hasil_pes),
        c.map((r) => r.hasil_hantavirus),
        c.map((r) => r.keterangan),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function ubahLab(id: number, d: DataLab): Promise<'ok' | 'duplikat' | 'tidak_ada'> {
  try {
    const res = await getDbClient().execute({
      sql: `UPDATE vektor_tikus_lab
            SET tgl_periksa = ?, kode_wilker = ?, nama_tikus = ?, lokasi_pemasangan = ?, kode_sampel = ?,
                hasil_leptospira = ?, hasil_pes = ?, hasil_hantavirus = ?, keterangan = ?
            WHERE id = ?`,
      args: [
        d.tgl_periksa, d.kode_wilker, d.nama_tikus, d.lokasi_pemasangan, d.kode_sampel,
        d.hasil_leptospira, d.hasil_pes, d.hasil_hantavirus, d.keterangan, id,
      ],
    });
    return res.rowsAffected ? 'ok' : 'tidak_ada';
  } catch (e) {
    if (adaDuplikat(e)) return 'duplikat';
    throw e;
  }
}

export async function hapusLab(id: number): Promise<boolean> {
  const res = await getDbClient().execute({ sql: `DELETE FROM vektor_tikus_lab WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}

// =====================================================================
// UNTUK DASHBOARD (view lab gabungan riwayat lama + data baru)
// =====================================================================

const KOLOM_LAB = `diuji_lab, leptospira_positif, leptospira_negatif, pes_positif, pes_negatif,
                   hantavirus_positif, hantavirus_negatif`;

function petaLab(r: Record<string, any>) {
  return {
    kode_wilker: String(r.kode_wilker),
    diuji_lab: angka(r.diuji_lab),
    leptospira_positif: angka(r.leptospira_positif),
    leptospira_negatif: angka(r.leptospira_negatif),
    pes_positif: angka(r.pes_positif),
    pes_negatif: angka(r.pes_negatif),
    hantavirus_positif: angka(r.hantavirus_positif),
    hantavirus_negatif: angka(r.hantavirus_negatif),
  };
}

export async function getLabTikusMingguan(tahun: number, kodeWilker?: string) {
  const pakaiWilker = !!kodeWilker && kodeWilker !== 'semua';
  const res = await getDbClient().execute({
    sql: `SELECT minggu_epid, kode_wilker, ${KOLOM_LAB} FROM view_tikus_lab_mingguan
          WHERE tahun = ?${pakaiWilker ? ' AND kode_wilker = ?' : ''} ORDER BY minggu_epid`,
    args: pakaiWilker ? [tahun, kodeWilker!] : [tahun],
  });
  return res.rows.map((r) => ({ minggu_epid: angka(r.minggu_epid), ...petaLab(r) }));
}

export async function getLabTikusBulanan(tahun: number, kodeWilker?: string) {
  const pakaiWilker = !!kodeWilker && kodeWilker !== 'semua';
  const res = await getDbClient().execute({
    sql: `SELECT bulan, kode_wilker, ${KOLOM_LAB} FROM view_tikus_lab_bulanan
          WHERE tahun = ?${pakaiWilker ? ' AND kode_wilker = ?' : ''} ORDER BY bulan`,
    args: pakaiWilker ? [tahun, kodeWilker!] : [tahun],
  });
  return res.rows.map((r) => ({ bulan: angka(r.bulan), ...petaLab(r) }));
}