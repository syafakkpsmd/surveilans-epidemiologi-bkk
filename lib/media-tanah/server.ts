// lib/media-tanah/server.ts
// HANYA untuk server. Memakai klien PostgreSQL bersama (lib/db/client.ts):
// placeholder `?` otomatis menjadi $1, $2, ...; DATE kembali 'YYYY-MM-DD'; numeric/bigint menjadi number.
import 'server-only';
import { getDbClient, type DbValue } from '@/lib/db/client';
import type { KamusWilker } from '@/lib/wilayah-kerja';
import { ITEM_B, ITEM_D, ITEM_E, KESIMPULAN, LABEL_ITEM } from './config';
import type { Pemeriksaan } from './validasi';

export type FilterTanah = { dari?: string; sampai?: string; wilayah?: string; kesimpulan?: string; q?: string };

const TGL = /^\d{4}-\d{2}-\d{2}$/;

export function filterDariQuery(sp: URLSearchParams, wk: KamusWilker): FilterTanah {
  const f: FilterTanah = {};
  const dari = sp.get('dari');
  const sampai = sp.get('sampai');
  const wilayah = sp.get('wilayah');
  const kes = sp.get('kesimpulan');
  const q = (sp.get('q') ?? '').trim();
  if (dari && TGL.test(dari)) f.dari = dari;
  if (sampai && TGL.test(sampai)) f.sampai = sampai;
  if (wilayah && wk.isKode(wilayah)) f.wilayah = wilayah;
  if (kes && KESIMPULAN.some((k) => k.nilai === kes)) f.kesimpulan = kes;
  if (q) f.q = q.slice(0, 80);
  return f;
}

// Kolom filter hanya ada di tanah_pemeriksaan, jadi aman dipakai pada query yang di-JOIN.
function bangunWhere(f: FilterTanah) {
  const w: string[] = ['TRUE'];
  const p: DbValue[] = [];
  const tambah = (kondisi: string, ...nilai: DbValue[]) => {
    w.push(kondisi);
    p.push(...nilai);
  };
  if (f.dari) tambah('tanggal_periksa >= ?', f.dari);
  if (f.sampai) tambah('tanggal_periksa <= ?', f.sampai);
  if (f.wilayah) tambah('wilayah = ?', f.wilayah);
  if (f.kesimpulan) tambah('kesimpulan = ?', f.kesimpulan);
  if (f.q) tambah('(nama_pelabuhan ILIKE ? OR area_lokasi ILIKE ?)', `%${f.q}%`, `%${f.q}%`);
  return { where: w.join(' AND '), p };
}

// Satu pernyataan atomik (CTE): header + seluruh butir masuk bersama, atau tidak sama sekali.
// Mengembalikan id baru, atau null jika titik/tanggal yang sama sudah ada.
export async function simpanPemeriksaan(p: Pemeriksaan, oleh: string, sumber: 'input' | 'upload') {
  const h = p.header;
  const r = p.hasil;
  const res = await getDbClient().execute({
    sql: `WITH h AS (
            INSERT INTO tanah_pemeriksaan
              (tanggal_periksa, wilayah, nama_pelabuhan, area_lokasi, penanggung_jawab, alamat_titik,
               petugas_pemeriksa, kondisi_cuaca, jenis_kegiatan, kesimpulan, uraian_kesimpulan, sumber, dibuat_oleh)
            VALUES (?::date, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (tanggal_periksa, wilayah, nama_pelabuhan, area_lokasi, alamat_titik) DO NOTHING
            RETURNING id
          ), d AS (
            INSERT INTO tanah_hasil (pemeriksaan_id, bagian, kode, hasil, batas_teks, status, keterangan, tindak_lanjut)
            SELECT h.id, x.bagian, x.kode, x.hasil, x.batas_teks, x.status, x.keterangan, x.tindak_lanjut
            FROM h, unnest(?::text[], ?::text[], ?::numeric[], ?::text[], ?::text[], ?::text[], ?::text[])
                 AS x(bagian, kode, hasil, batas_teks, status, keterangan, tindak_lanjut)
            RETURNING 1
          )
          SELECT (SELECT id FROM h) AS id`,
    args: [
      h.tanggal_periksa, h.wilayah, h.nama_pelabuhan, h.area_lokasi, h.penanggung_jawab, h.alamat_titik,
      h.petugas_pemeriksa, h.kondisi_cuaca, h.jenis_kegiatan, h.kesimpulan, h.uraian_kesimpulan, sumber, oleh,
      r.map((x) => x.bagian), r.map((x) => x.kode), r.map((x) => x.hasil), r.map((x) => x.batas_teks),
      r.map((x) => x.status), r.map((x) => x.keterangan), r.map((x) => x.tindak_lanjut),
    ] as unknown as DbValue[],
  });
  const id = res.rows[0]?.id;
  return id == null ? null : Number(id);
}

export async function daftarPemeriksaan(f: FilterTanah, limit = 50, offset = 0) {
  const { where, p } = bangunWhere(f);
  const res = await getDbClient().execute({
    sql: `SELECT p.id, p.tanggal_periksa, p.wilayah, p.nama_pelabuhan, p.area_lokasi, p.alamat_titik,
                 p.petugas_pemeriksa, p.kesimpulan,
                 COUNT(r.kode) FILTER (WHERE r.bagian = 'B' AND r.status = 'tidak_memenuhi') AS temuan_b,
                 COUNT(r.kode) FILTER (WHERE r.bagian = 'D' AND r.status = 'ada') AS temuan_d,
                 COUNT(r.kode) FILTER (WHERE r.bagian IN ('C','E') AND r.status = 'tidak_memenuhi') AS temuan_ce
          FROM tanah_pemeriksaan p LEFT JOIN tanah_hasil r ON r.pemeriksaan_id = p.id
          WHERE ${where}
          GROUP BY p.id
          ORDER BY p.tanggal_periksa DESC, p.id DESC
          LIMIT ? OFFSET ?`,
    args: [...p, Math.min(limit, 200), offset],
  });
  return res.rows;
}

export async function ambilDetail(id: number) {
  const db = getDbClient();
  const [h, r] = await Promise.all([
    db.execute({ sql: `SELECT * FROM tanah_pemeriksaan WHERE id = ?`, args: [id] }),
    db.execute({
      sql: `SELECT bagian, kode, hasil, batas_teks, status, keterangan, tindak_lanjut
            FROM tanah_hasil WHERE pemeriksaan_id = ? ORDER BY bagian, length(kode), kode`,
      args: [id],
    }),
  ]);
  if (!h.rows[0]) return null;
  return { header: h.rows[0], hasil: r.rows.map((x) => ({ ...x, label: LABEL_ITEM[String(x.kode)] ?? String(x.kode) })) };
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

export async function ambilDashboard(f: FilterTanah) {
  const { where, p } = bangunWhere(f);
  const db = getDbClient();

  const [ringkasRes, sampelRes, temuanRes, mingguRes, bulanRes] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE kesimpulan = 'memenuhi') AS memenuhi,
                   COUNT(*) FILTER (WHERE kesimpulan = 'tidak_memenuhi') AS tidak_memenuhi,
                   COUNT(*) FILTER (WHERE kesimpulan = 'perlu_lab') AS perlu_lab,
                   COUNT(DISTINCT nama_pelabuhan) AS pelabuhan
            FROM tanah_pemeriksaan WHERE ${where}`,
      args: p,
    }),
    db.execute({
      sql: `SELECT COUNT(DISTINCT r.pemeriksaan_id) AS n
            FROM tanah_hasil r JOIN tanah_pemeriksaan ON tanah_pemeriksaan.id = r.pemeriksaan_id
            WHERE r.bagian = 'E' AND ${where}`,
      args: p,
    }),
    db.execute({
      sql: `SELECT r.kode,
                   COUNT(*) FILTER (WHERE (r.bagian = 'D' AND r.status = 'ada')
                                       OR (r.bagian IN ('B','E') AND r.status = 'tidak_memenuhi')) AS temuan
            FROM tanah_hasil r JOIN tanah_pemeriksaan ON tanah_pemeriksaan.id = r.pemeriksaan_id
            WHERE ${where} GROUP BY r.kode`,
      args: p,
    }),
    // date_trunc('week') selalu jatuh di hari Senin (ISO)
    db.execute({
      sql: `SELECT to_char(date_trunc('week', tanggal_periksa::timestamp), 'YYYY-MM-DD') AS periode, COUNT(*) AS n
            FROM tanah_pemeriksaan WHERE ${where} GROUP BY 1 ORDER BY 1`,
      args: p,
    }),
    db.execute({
      sql: `SELECT to_char(tanggal_periksa, 'YYYY-MM') AS periode, COUNT(*) AS n
            FROM tanah_pemeriksaan WHERE ${where} GROUP BY 1 ORDER BY 1`,
      args: p,
    }),
  ]);

  const r = ringkasRes.rows[0];
  const temuan = new Map<string, number>(temuanRes.rows.map((x) => [String(x.kode), n(x.temuan)]));
  const urut = (a: { n: number }, b: { n: number }) => b.n - a.n;

  return {
    ringkas: {
      total: n(r.total),
      memenuhi: n(r.memenuhi),
      tidakMemenuhi: n(r.tidak_memenuhi),
      perluLab: n(r.perlu_lab),
      pelabuhan: n(r.pelabuhan),
      sampelLab: n(sampelRes.rows[0]?.n),
    },
    kesimpulan: [
      { label: 'Memenuhi', n: n(r.memenuhi) },
      { label: 'Tidak memenuhi', n: n(r.tidak_memenuhi) },
      { label: 'Perlu lab lanjutan', n: n(r.perlu_lab) },
    ],
    temuanB: ITEM_B.map((i) => ({ label: i.singkat, n: temuan.get(i.kode) ?? 0 })).sort(urut),
    temuanD: ITEM_D.map((i) => ({ label: i.singkat, n: temuan.get(i.kode) ?? 0 })).sort(urut),
    temuanE: ITEM_E.map((i) => ({ label: i.label, n: temuan.get(i.kode) ?? 0 })).filter((x) => x.n > 0).sort(urut),
    mingguan: isiMingguan(mingguRes.rows.map((x) => ({ periode: String(x.periode), n: n(x.n) }))),
    bulanan: isiBulanan(bulanRes.rows.map((x) => ({ periode: String(x.periode), n: n(x.n) }))),
  };
}