// lib/klinik/ckg/server.ts
// HANYA untuk server (route handler / server component).
// Memakai klien PostgreSQL bersama (lib/db/client.ts): placeholder `?` otomatis menjadi $1, $2, ...
// DATE kembali sebagai 'YYYY-MM-DD' dan numeric/bigint sebagai number (diatur di klien itu).
import 'server-only';
import { getDbClient, type DbValue } from '@/lib/db/client';
import { BATAS, KELOMPOK_UMUR, KODE_WILAYAH } from './config';
import type { BarisCkg } from './validasi';

export type FilterCkg = {
  dari?: string;
  sampai?: string;
  wilayah?: string;
  umurMin?: number;
  umurMax?: number;
};

const TGL = /^\d{4}-\d{2}-\d{2}$/;

export function filterDariQuery(sp: URLSearchParams): FilterCkg {
  const f: FilterCkg = {};
  const dari = sp.get('dari');
  const sampai = sp.get('sampai');
  const wilayah = sp.get('wilayah');
  const umin = sp.get('umur_min');
  const umax = sp.get('umur_max');
  if (dari && TGL.test(dari)) f.dari = dari;
  if (sampai && TGL.test(sampai)) f.sampai = sampai;
  if (wilayah && KODE_WILAYAH.includes(wilayah)) f.wilayah = wilayah;
  if (umin && Number.isInteger(Number(umin))) f.umurMin = Number(umin);
  if (umax && Number.isInteger(Number(umax))) f.umurMax = Number(umax);
  return f;
}

function bangunWhere(f: FilterCkg) {
  const w: string[] = ['TRUE'];
  const p: DbValue[] = [];
  const tambah = (kondisi: string, nilai: DbValue) => (w.push(kondisi), p.push(nilai));
  if (f.dari) tambah('tanggal_periksa >= ?', f.dari);
  if (f.sampai) tambah('tanggal_periksa <= ?', f.sampai);
  if (f.wilayah) tambah('wilayah = ?', f.wilayah);
  if (f.umurMin != null) tambah('umur >= ?', f.umurMin);
  if (f.umurMax != null) tambah('umur <= ?', f.umurMax);
  return { where: w.join(' AND '), p };
}

export async function simpanBanyak(rows: BarisCkg[], oleh: string, sumber: 'input' | 'upload') {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const c = rows.slice(i, i + 500);
    // Satu query per 500 baris lewat unnest. ON CONFLICT DO NOTHING melewati baris dengan
    // (tanggal, wilayah, nama) yang sudah ada; rowsAffected = baris yang benar-benar masuk.
    const res = await db.execute({
      sql: `INSERT INTO ckg_pemeriksaan
              (tanggal_periksa, wilayah, nama, jenis_kelamin, umur, bb, tb, imt, sistolik, diastolik, gula_darah, merokok, sumber, dibuat_oleh)
            SELECT t, w, n, jk, u, bb, tb, imt, s, d, g, m, ?, ?
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::smallint[], ?::numeric[], ?::numeric[],
                        ?::numeric[], ?::smallint[], ?::smallint[], ?::smallint[], ?::smallint[])
                 AS x(t, w, n, jk, u, bb, tb, imt, s, d, g, m)
            ON CONFLICT (tanggal_periksa, wilayah, nama) DO NOTHING`,
      args: [
        sumber,
        oleh,
        c.map((r) => r.tanggal_periksa),
        c.map((r) => r.wilayah),
        c.map((r) => r.nama),
        c.map((r) => r.jenis_kelamin),
        c.map((r) => r.umur),
        c.map((r) => r.bb),
        c.map((r) => r.tb),
        c.map((r) => r.imt),
        c.map((r) => r.sistolik),
        c.map((r) => r.diastolik),
        c.map((r) => r.gula_darah),
        c.map((r) => r.merokok),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function daftarPemeriksaan(f: FilterCkg, limit = 100, offset = 0) {
  const { where, p } = bangunWhere(f);
  const res = await getDbClient().execute({
    sql: `SELECT * FROM ckg_pemeriksaan WHERE ${where} ORDER BY tanggal_periksa DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 500), offset],
  });
  return res.rows;
}

const n = (v: unknown) => Number(v ?? 0);

// Isi minggu/bulan kosong dengan 0 agar garis dan batang tidak melompati periode.
function isiMingguan(rows: { periode: string; n: number }[]) {
  if (!rows.length) return rows;
  const peta = new Map(rows.map((r) => [r.periode, r.n]));
  const akhir = Date.parse(rows[rows.length - 1].periode + 'T00:00:00Z');
  const out: { periode: string; n: number }[] = [];
  for (let t = Date.parse(rows[0].periode + 'T00:00:00Z'); t <= akhir; t += 7 * 86400000) {
    const k = new Date(t).toISOString().slice(0, 10);
    out.push({ periode: k, n: peta.get(k) ?? 0 });
  }
  return out;
}

function isiBulanan(rows: { periode: string; n: number }[]) {
  if (!rows.length) return rows;
  const peta = new Map(rows.map((r) => [r.periode, r.n]));
  const [y0, m0] = rows[0].periode.split('-').map(Number);
  const [y1, m1] = rows[rows.length - 1].periode.split('-').map(Number);
  const out: { periode: string; n: number }[] = [];
  for (let i = y0 * 12 + m0 - 1; i <= y1 * 12 + m1 - 1; i++) {
    const k = `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
    out.push({ periode: k, n: peta.get(k) ?? 0 });
  }
  return out;
}

export async function ambilDashboard(f: FilterCkg) {
  const { where, p } = bangunWhere(f);
  const db = getDbClient();
  const caseUmur = `CASE ${KELOMPOK_UMUR.map(
    (k) => `WHEN umur BETWEEN ${k.min} AND ${k.max} THEN '${k.label}'`
  ).join(' ')} END`;

  const [ringkasRes, umurRes, mingguRes, bulanRes] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE jenis_kelamin = 'L') AS pria,
                   COUNT(*) FILTER (WHERE jenis_kelamin = 'P') AS wanita,
                   COUNT(*) FILTER (WHERE merokok = 1) AS perokok,
                   COUNT(*) FILTER (WHERE sistolik > ${BATAS.sistolik} OR diastolik > ${BATAS.diastolik}) AS hipertensi,
                   COUNT(*) FILTER (WHERE gula_darah >= ${BATAS.gulaDarah}) AS gula_tinggi,
                   COUNT(*) FILTER (WHERE imt >= 25) AS obesitas
            FROM ckg_pemeriksaan WHERE ${where}`,
      args: p,
    }),
    db.execute({ sql: `SELECT ${caseUmur} AS label, COUNT(*) AS n FROM ckg_pemeriksaan WHERE ${where} GROUP BY 1`, args: p }),
    // date_trunc('week') selalu jatuh di hari Senin (ISO)
    db.execute({
      sql: `SELECT to_char(date_trunc('week', tanggal_periksa::timestamp), 'YYYY-MM-DD') AS periode, COUNT(*) AS n
            FROM ckg_pemeriksaan WHERE ${where} GROUP BY 1 ORDER BY 1`,
      args: p,
    }),
    db.execute({
      sql: `SELECT to_char(tanggal_periksa, 'YYYY-MM') AS periode, COUNT(*) AS n
            FROM ckg_pemeriksaan WHERE ${where} GROUP BY 1 ORDER BY 1`,
      args: p,
    }),
  ]);

  const r = ringkasRes.rows[0];
  const total = n(r.total);
  const umurPeta = new Map<string, number>(umurRes.rows.map((x) => [String(x.label), n(x.n)]));

  return {
    ringkas: {
      total,
      pria: n(r.pria),
      wanita: n(r.wanita),
      perokok: n(r.perokok),
      hipertensi: n(r.hipertensi),
      gulaTinggi: n(r.gula_tinggi),
      obesitas: n(r.obesitas),
    },
    jenisKelamin: [
      { label: 'Pria', n: n(r.pria) },
      { label: 'Wanita', n: n(r.wanita) },
    ],
    umur: KELOMPOK_UMUR.map((k) => ({ label: k.label, n: umurPeta.get(k.label) ?? 0 })),
    merokok: [
      { label: 'Merokok', n: n(r.perokok) },
      { label: 'Tidak merokok', n: total - n(r.perokok) },
    ],
    mingguan: isiMingguan(mingguRes.rows.map((x) => ({ periode: String(x.periode), n: n(x.n) }))),
    bulanan: isiBulanan(bulanRes.rows.map((x) => ({ periode: String(x.periode), n: n(x.n) }))),
  };
}