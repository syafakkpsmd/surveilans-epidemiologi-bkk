// SERVER-ONLY. Ringkasan dokumen sertifikat kapal per tahun terbit.
import { getDbClient } from '@/lib/db/client';

export type JenisSertifikat = 'sscec' | 'p3k' | 'buku' | 'air';

const KONFIG: Record<JenisSertifikat, { tabel: string; kolomGt: string | null }> = {
  sscec: { tabel: 'sertifikat_sscec', kolomGt: 'berat_gt' },
  p3k: { tabel: 'sertifikat_p3k', kolomGt: 'berat' },
  buku: { tabel: 'buku_kesehatan', kolomGt: 'berat' },
  air: { tabel: 'sertifikat_air', kolomGt: null },
};

export interface RingkasanSertifikat {
  total: number;
  jumlahBayar: number;
  perGt: { gt: number | null; n: number }[];
  perWilker: { wilayah: string; n: number }[];
}

export async function getRingkasanSertifikat(jenis: JenisSertifikat, tahun: number): Promise<RingkasanSertifikat> {
  const { tabel, kolomGt } = KONFIG[jenis]; // nama tabel/kolom dari konstanta di atas, bukan input pengguna
  const { rows } = await getDbClient().execute({
    sql: `SELECT ${kolomGt ? `${kolomGt}::float8` : 'NULL::float8'} AS gt,
                 COALESCE(wilayah_kerja, '-') AS wilayah,
                 count(*)::int AS n,
                 COALESCE(sum(jumlah_bayar), 0)::float8 AS bayar
            FROM ${tabel}
           WHERE tgl_terbit >= ?::date AND tgl_terbit < ?::date
           GROUP BY 1, 2`,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`],
  });

  const perGtMap = new Map<number | null, number>();
  const perWilkerMap = new Map<string, number>();
  let total = 0;
  let jumlahBayar = 0;
  for (const r of rows) {
    const gt = r.gt == null ? null : Number(r.gt);
    const n = Number(r.n) || 0;
    total += n;
    jumlahBayar += Number(r.bayar) || 0;
    perGtMap.set(gt, (perGtMap.get(gt) ?? 0) + n);
    perWilkerMap.set(String(r.wilayah), (perWilkerMap.get(String(r.wilayah)) ?? 0) + n);
  }
  return {
    total,
    jumlahBayar,
    perGt: [...perGtMap.entries()].map(([gt, n]) => ({ gt, n })),
    perWilker: [...perWilkerMap.entries()].map(([wilayah, n]) => ({ wilayah, n })).sort((a, b) => b.n - a.n),
  };
}