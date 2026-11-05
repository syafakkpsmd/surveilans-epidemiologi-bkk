import { getDbClient } from '@/lib/db/client';

export interface PilihanKlinik {
  kode: string;
  nama: string;
}

export interface PoliklinikNonBkk {
  id: string;
  nama: string;
  alamat: string | null;
  kabupaten_kota: string | null;
  telepon: string | null;
  kode_wilker: string | null;
  aktif: boolean;
}

/** Poliklinik NON-BKK (tabel poliklinik_non_bkk). Tabel `poliklinik` milik BKK tidak disentuh. */
export async function getPoliklinikNonBkk(hanyaAktif = true): Promise<PoliklinikNonBkk[]> {
  const { rows } = await getDbClient().execute(
    `SELECT id::text AS id, nama, alamat, kabupaten_kota, telepon, kode_wilker, aktif
       FROM poliklinik_non_bkk
      ${hanyaAktif ? 'WHERE aktif' : ''} ORDER BY nama ASC`
  );
  return rows as PoliklinikNonBkk[];
}


/** Untuk dropdown pendaftaran: kode = id (uuid sebagai teks). */
export async function getPilihanPoliklinik(): Promise<PilihanKlinik[]> {
  const { rows } = await getDbClient().execute(
    `SELECT id::text AS kode, nama FROM poliklinik_non_bkk WHERE aktif ORDER BY nama ASC`
  );
  return rows as PilihanKlinik[];
}

/** Klinik binaan sungguhan saja (entri kategori 'bkk' = BKK induk, tidak ikut). */
export async function getKlinikBinaan(): Promise<PilihanKlinik[]> {
  const { rows } = await getDbClient().execute(
    `SELECT id::text AS kode, nama_klinik AS nama
       FROM klinik_binaan
      WHERE kategori = 'klinik' AND aktif
      ORDER BY nama_klinik ASC`
  );
  return rows as PilihanKlinik[];
}

export async function kodeKlinikValid(jenis: 'poliklinik' | 'klinik_binaan', kode: string): Promise<boolean> {
  const sql =
    jenis === 'poliklinik'
      ? `SELECT 1 FROM poliklinik_non_bkk WHERE id::text = ? AND aktif LIMIT 1`
      : `SELECT 1 FROM klinik_binaan WHERE id::text = ? AND kategori = 'klinik' AND aktif LIMIT 1`;
  const { rows } = await getDbClient().execute({ sql, args: [kode] });
  return rows.length > 0;
}

export async function tambahPoliklinikNonBkk(d: {
  nama: string; kode_wilker: string; alamat: string | null; kabupaten_kota: string | null; telepon: string | null;
}) {
  await getDbClient().execute({
    sql: `INSERT INTO poliklinik_non_bkk (nama, kode_wilker, alamat, kabupaten_kota, telepon) VALUES (?, ?, ?, ?, ?)`,
    args: [d.nama, d.kode_wilker, d.alamat, d.kabupaten_kota, d.telepon],
  });
}

export async function setAktifMaster(
  tabel: 'poliklinik_non_bkk',
  id: number | string,
  aktif: boolean
) {
  await getDbClient().execute({ sql: `UPDATE ${tabel} SET aktif = ? WHERE id::text = ?`, args: [aktif, String(id)] });
}

export async function getPoliklinikNonBkkById(id: string): Promise<PoliklinikNonBkk | null> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT id::text AS id, nama, alamat, kabupaten_kota, telepon, kode_wilker, aktif
            FROM poliklinik_non_bkk WHERE id = ?::uuid`,
    args: [id],
  });
  return (rows[0] as PoliklinikNonBkk) ?? null;
}

export async function ubahPoliklinikNonBkk(
  id: string,
  d: { nama: string; kode_wilker: string; namaWilker: string; alamat: string | null; kabupaten_kota: string | null; telepon: string | null }
) {
  await getDbClient().batch([
    {
      sql: `UPDATE poliklinik_non_bkk SET nama = ?, kode_wilker = ?, alamat = ?, kabupaten_kota = ?, telepon = ? WHERE id = ?::uuid`,
      args: [d.nama, d.kode_wilker, d.alamat, d.kabupaten_kota, d.telepon, id],
    },
    // data kunjungan lama ikut pindah wilker agar grafik tetap konsisten
    {
      sql: `UPDATE kunjungan_poliklinik SET wilayah_kerja = ? WHERE poliklinik_id = ?::uuid`,
      args: [d.namaWilker, id],
    },
  ]);
}