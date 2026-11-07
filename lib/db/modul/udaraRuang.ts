// lib/db/modul/udaraRuang.ts  (FILE BARU)
// SERVER-ONLY. Membaca tabel Karhutla (pengukuran kualitas udara) untuk dasbor Udara Dalam Ruang.
// Nama kolom dipetakan ke nama logika lewat alias SQL, sehingga seluruh aplikasi memakai nama yang sama
// walau nama kolom di database berbeda (lihat lib/udara-ruang/skema.ts).
import { getDbClient } from '@/lib/db/client';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import { KOLOM_LAMA, TABEL_UDARA } from '@/lib/udara-ruang/skema';
import { PARAMETER, kolomDb } from '@/lib/udara-ruang/parameter';
import type { BarisUdara } from '@/lib/udara-ruang/hitung';

const q = (id: string) => '"' + id.replace(/"/g, '') + '"';

const SELECT = [
  `${q('id')} AS id`,
  `${q(KOLOM_LAMA.tanggal)} AS tanggal`,
  `${q(KOLOM_LAMA.lokasi)} AS lokasi`,
  ...['wilayah_kerja', 'nama_pelabuhan', 'nama_gedung', 'nama_ruangan', 'fungsi_ruangan', 'sumber', 'kesimpulan', 'rekomendasi'].map((c) => `${q(c)} AS ${q(c)}`),
  ...PARAMETER.map((p) => `${q(kolomDb(p.kunci))} AS ${q(p.kunci)}`),
].join(', ');

/** Angka dari kolom yang mungkin bertipe teks: kosong, "-" dan non-angka menjadi null. 0 tetap 0. */
function angka(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(',', '.');
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Semua pengukuran pada satu tahun (semua wilayah; filter wilayah/tanggal dilakukan di dasbor). */
export async function getPengukuranUdara(tahun: number): Promise<BarisUdara[]> {
  const r = await getDbClient().execute({
    sql: `SELECT ${SELECT} FROM ${q(TABEL_UDARA)} WHERE ${q(KOLOM_LAMA.tanggal)} >= ? AND ${q(KOLOM_LAMA.tanggal)} < ?
          ORDER BY ${q(KOLOM_LAMA.tanggal)} DESC`,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`],
  });
  return r.rows.map((x) => {
    const tanggal = String(x.tanggal).slice(0, 10);
    const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date(`${tanggal}T00:00:00`));
    const baris: Record<string, unknown> = { ...x, tanggal, minggu: mingguEpid, tahun_epid: tahunEpid };
    for (const p of PARAMETER) baris[p.kunci] = angka(x[p.kunci]);
    return baris as unknown as BarisUdara;
  });
}
