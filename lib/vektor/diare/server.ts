// lib/vektor/diare/server.ts
// HANYA untuk server (route handler / server component).
import 'server-only';
import { getDbClient, type DbValue } from '@/lib/db/client';
import { KODE_WILAYAH, STATUS_MS, STATUS_TMS, type Jenis } from './config';
import type { DataSurvei, DataTindakan, KunciSurvei } from './validasi';

export type FilterDiare = {
  jenis: Jenis;
  dari?: string;
  sampai?: string;
  wilayah?: string;
  hasil?: 'ms' | 'tms';
  tanpaTindakan?: boolean;
};

const TGL = /^\d{4}-\d{2}-\d{2}$/;

export function filterDariQuery(sp: URLSearchParams): FilterDiare | null {
  const jenis = sp.get('jenis');
  if (jenis !== 'lalat' && jenis !== 'kecoa') return null;
  const f: FilterDiare = { jenis };
  const dari = sp.get('dari');
  const sampai = sp.get('sampai');
  const wilayah = sp.get('wilayah');
  const hasil = sp.get('hasil');
  if (dari && TGL.test(dari)) f.dari = dari;
  if (sampai && TGL.test(sampai)) f.sampai = sampai;
  if (wilayah && KODE_WILAYAH.includes(wilayah)) f.wilayah = wilayah;
  if (hasil === 'ms' || hasil === 'tms') f.hasil = hasil;
  if (sp.get('tanpa_tindakan') === '1') f.tanpaTindakan = true;
  return f;
}

function bangunWhere(f: FilterDiare) {
  const w: string[] = ['jenis_kegiatan = ?'];
  const p: DbValue[] = [f.jenis];
  const tambah = (kondisi: string, nilai: DbValue) => (w.push(kondisi), p.push(nilai));
  if (f.dari) tambah('tgl_kegiatan >= ?', f.dari);
  if (f.sampai) tambah('tgl_kegiatan <= ?', f.sampai);
  if (f.wilayah) tambah('kode_wilker = ?', f.wilayah);
  if (f.hasil) tambah('hasil_pengamatan = ?', f.hasil === 'ms' ? STATUS_MS : STATUS_TMS);
  if (f.tanpaTindakan) w.push(`(tindakan_pengendalian IS NULL OR btrim(tindakan_pengendalian) = '')`);
  return { where: w.join(' AND '), p };
}

const kunciBaris = (k: KunciSurvei) =>
  `${k.tgl_kegiatan}|${k.kode_wilker}|${k.jenis_kegiatan}|${k.lokasi.toLowerCase()}`;

// Baris kembar di dalam satu file: yang pertama dipakai.
function tanpaDuplikat<T>(rows: T[], ambilKunci: (r: T) => string) {
  const lihat = new Set<string>();
  const unik: T[] = [];
  for (const r of rows) {
    const k = ambilKunci(r);
    if (!lihat.has(k)) {
      lihat.add(k);
      unik.push(r);
    }
  }
  return unik;
}

export async function daftarDiare(f: FilterDiare, limit = 100, offset = 0) {
  const { where, p } = bangunWhere(f);
  const res = await getDbClient().execute({
    sql: `SELECT id, tgl_kegiatan, kode_wilker, jenis_kegiatan, lokasi,
                 COALESCE(nilai_hasil_pengamatan, fly_index, kepadatan_kecoa_per_m2) AS nilai,
                 hasil_pengamatan, tindakan_pengendalian, insektisida_terpakai_ml,
                 luas_area_semprot_m2, keterangan
          FROM vektor_diare WHERE ${where}
          ORDER BY tgl_kegiatan DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 500), offset],
  });
  return res.rows;
}

export async function simpanSurvei(rows: DataSurvei[], oleh: string) {
  if (!rows.length) return { masuk: 0, duplikat: 0 };
  const unik = tanpaDuplikat(rows, kunciBaris);
  const db = getDbClient();
  let masuk = 0;
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `INSERT INTO vektor_diare
              (tgl_kegiatan, kode_wilker, jenis_kegiatan, lokasi, nilai_hasil_pengamatan, hasil_pengamatan,
               fly_index, kepadatan_kecoa_per_m2, keterangan, input_oleh)
            SELECT x.t, x.w, x.j, x.l, x.v, x.h,
                   CASE WHEN x.j = 'lalat' THEN x.v END,
                   CASE WHEN x.j = 'kecoa' THEN x.v END,
                   x.k, ?::text
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::numeric[], ?::text[], ?::text[])
                 AS x(t, w, j, l, v, h, k)
            WHERE NOT EXISTS (
              SELECT 1 FROM vektor_diare d
              WHERE d.tgl_kegiatan = x.t AND d.kode_wilker = x.w AND d.jenis_kegiatan = x.j
                AND lower(btrim(d.lokasi)) = lower(x.l))`,
      args: [
        oleh,
        c.map((r) => r.tgl_kegiatan),
        c.map((r) => r.kode_wilker),
        c.map((r) => r.jenis_kegiatan),
        c.map((r) => r.lokasi),
        c.map((r) => r.nilai),
        c.map((r) => r.hasil_pengamatan),
        c.map((r) => r.keterangan),
      ] as unknown as DbValue[],
    });
    masuk += res.rowsAffected;
  }
  return { masuk, duplikat: rows.length - masuk };
}

export async function ubahSurvei(id: number, d: DataSurvei): Promise<'ok' | 'duplikat' | 'tidak_ada'> {
  const db = getDbClient();
  const kembar = await db.execute({
    sql: `SELECT 1 FROM vektor_diare
          WHERE id <> ? AND tgl_kegiatan = ? AND kode_wilker = ? AND jenis_kegiatan = ?
            AND lower(btrim(lokasi)) = lower(?) LIMIT 1`,
    args: [id, d.tgl_kegiatan, d.kode_wilker, d.jenis_kegiatan, d.lokasi],
  });
  if (kembar.rows.length) return 'duplikat';

  const res = await db.execute({
    sql: `UPDATE vektor_diare
          SET tgl_kegiatan = ?, kode_wilker = ?, lokasi = ?, nilai_hasil_pengamatan = ?, hasil_pengamatan = ?,
              fly_index = ?, kepadatan_kecoa_per_m2 = ?, keterangan = ?
          WHERE id = ? AND jenis_kegiatan = ?`,
    args: [
      d.tgl_kegiatan, d.kode_wilker, d.lokasi, d.nilai, d.hasil_pengamatan,
      d.jenis_kegiatan === 'lalat' ? d.nilai : null,
      d.jenis_kegiatan === 'kecoa' ? d.nilai : null,
      d.keterangan, id, d.jenis_kegiatan,
    ],
  });
  return res.rowsAffected ? 'ok' : 'tidak_ada';
}

export async function hapusSurvei(id: number, jenis: Jenis): Promise<boolean> {
  const res = await getDbClient().execute({
    sql: `DELETE FROM vektor_diare WHERE id = ? AND jenis_kegiatan = ?`,
    args: [id, jenis],
  });
  return res.rowsAffected > 0;
}

// ---- Tindakan pengendalian: mengisi tiga kolom di baris survei yang sudah ada ----

export async function terapkanTindakan(id: number, jenis: Jenis, t: DataTindakan): Promise<boolean> {
  const res = await getDbClient().execute({
    sql: `UPDATE vektor_diare
          SET tindakan_pengendalian = ?, insektisida_terpakai_ml = ?, luas_area_semprot_m2 = ?
          WHERE id = ? AND jenis_kegiatan = ?`,
    args: [t.tindakan_pengendalian, t.insektisida_terpakai_ml, t.luas_area_semprot_m2, id, jenis],
  });
  return res.rowsAffected > 0;
}

export async function hapusTindakan(id: number, jenis: Jenis): Promise<boolean> {
  const res = await getDbClient().execute({
    sql: `UPDATE vektor_diare
          SET tindakan_pengendalian = NULL, insektisida_terpakai_ml = NULL, luas_area_semprot_m2 = NULL
          WHERE id = ? AND jenis_kegiatan = ?`,
    args: [id, jenis],
  });
  return res.rowsAffected > 0;
}

export type ItemTindakan = { baris: number; kunci: KunciSurvei; tindakan: DataTindakan };

/** Untuk unggahan: cocokkan ke survei lewat tanggal+wilayah+jenis+lokasi. */
export async function terapkanTindakanBanyak(items: ItemTindakan[]) {
  const unik = tanpaDuplikat(items, (it) => kunciBaris(it.kunci));
  const db = getDbClient();
  const ketemu = new Set<string>();
  for (let i = 0; i < unik.length; i += 500) {
    const c = unik.slice(i, i + 500);
    const res = await db.execute({
      sql: `UPDATE vektor_diare d
            SET tindakan_pengendalian = x.tin, insektisida_terpakai_ml = x.ins, luas_area_semprot_m2 = x.luas
            FROM unnest(?::date[], ?::text[], ?::text[], ?::text[], ?::text[], ?::numeric[], ?::numeric[])
                 AS x(t, w, j, l, tin, ins, luas)
            WHERE d.tgl_kegiatan = x.t AND d.kode_wilker = x.w AND d.jenis_kegiatan = x.j
              AND lower(btrim(d.lokasi)) = lower(x.l)
            RETURNING d.tgl_kegiatan AS t, d.kode_wilker AS w, d.jenis_kegiatan AS j, lower(btrim(d.lokasi)) AS l`,
      args: [
        c.map((it) => it.kunci.tgl_kegiatan),
        c.map((it) => it.kunci.kode_wilker),
        c.map((it) => it.kunci.jenis_kegiatan),
        c.map((it) => it.kunci.lokasi),
        c.map((it) => it.tindakan.tindakan_pengendalian),
        c.map((it) => it.tindakan.insektisida_terpakai_ml),
        c.map((it) => it.tindakan.luas_area_semprot_m2),
      ] as unknown as DbValue[],
    });
    for (const r of res.rows) ketemu.add(`${r.t}|${r.w}|${r.j}|${r.l}`);
  }
  const tidakDitemukan = unik.filter((it) => !ketemu.has(kunciBaris(it.kunci))).map((it) => it.baris);
  return { diterapkan: unik.length - tidakDitemukan.length, tidakDitemukan };
}