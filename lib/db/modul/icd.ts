import { getDbClient } from '@/lib/db/client';

export interface IcdHit {
  kode: string;
  nama: string;
  kategori: string | null;
}

const mapRow = (r: Record<string, any>): IcdHit => ({
  kode: String(r.kode),
  nama: String(r.nama),
  kategori: r.kategori == null ? null : String(r.kategori),
});

/** Semua kata harus cocok di kode ATAU nama. Kode yang persis/berawalan sama diurutkan lebih dulu. */
export async function cariIcd(q: string): Promise<IcdHit[]> {
  const tokens = q.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean).slice(0, 6);
  if (!tokens.length) return [];
  const syarat = tokens.map(() => `(lower(kode) LIKE ? OR lower(nama) LIKE ?)`).join(' AND ');
  const args: string[] = [];
  for (const t of tokens) args.push(`%${t}%`, `%${t}%`);
  const { rows } = await getDbClient().execute({
    sql: `SELECT kode, nama, kategori FROM icd10
           WHERE ${syarat}
           ORDER BY CASE WHEN upper(kode) = upper(?) THEN 0
                         WHEN upper(kode) LIKE upper(?) || '%' THEN 1
                         WHEN lower(nama) LIKE lower(?) || '%' THEN 2 ELSE 3 END, kode
           LIMIT 10`,
    args: [...args, q, q, q],
  });
  return rows.map(mapRow);
}

/** Dipakai saat menyimpan: kode harus benar-benar ada di daftar (tanpa teks bebas). */
export async function ambilIcd(kode: string): Promise<IcdHit | null> {
  const { rows } = await getDbClient().execute({
    sql: 'SELECT kode, nama, kategori FROM icd10 WHERE kode = ? LIMIT 1',
    args: [kode],
  });
  return rows[0] ? mapRow(rows[0]) : null;
}