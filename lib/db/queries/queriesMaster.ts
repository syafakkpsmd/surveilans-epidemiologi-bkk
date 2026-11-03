import { getDbClient } from '@/lib/db/client';

export interface PilihanKlinik {
  kode: string;
  nama: string;
}

export interface WilayahKerja {
  id: number;
  kode: string;
  nama: string;
  jenis: 'pelabuhan' | 'bandara' | 'pos_lintas_batas' | 'lainnya';
  urutan: number;
  aktif: boolean;
}

export interface PoliklinikNonBkk {
  id: string;
  nama: string;
  alamat: string | null;
  kabupaten_kota: string | null;
  telepon: string | null;
  aktif: boolean;
}

export async function getWilayahKerja(hanyaAktif = true): Promise<WilayahKerja[]> {
  const { rows } = await getDbClient().execute(
    `SELECT id, kode, nama, jenis, urutan, aktif FROM wilayah_kerja
      ${hanyaAktif ? 'WHERE aktif' : ''} ORDER BY urutan ASC, nama ASC`
  );
  return rows as WilayahKerja[];
}

/** Poliklinik NON-BKK (tabel poliklinik_non_bkk). Tabel `poliklinik` milik BKK tidak disentuh. */
export async function getPoliklinikNonBkk(hanyaAktif = true): Promise<PoliklinikNonBkk[]> {
  const { rows } = await getDbClient().execute(
    `SELECT id::text AS id, nama, alamat, kabupaten_kota, telepon, aktif
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

export async function tambahWilayahKerja(d: { kode: string; nama: string; jenis: string; urutan: number }) {
  await getDbClient().execute({
    sql: `INSERT INTO wilayah_kerja (kode, nama, jenis, urutan) VALUES (?, ?, ?, ?)`,
    args: [d.kode, d.nama, d.jenis, d.urutan],
  });
}

export async function tambahPoliklinikNonBkk(d: {
  nama: string;
  alamat: string | null;
  kabupaten_kota: string | null;
  telepon: string | null;
}) {
  await getDbClient().execute({
    sql: `INSERT INTO poliklinik_non_bkk (nama, alamat, kabupaten_kota, telepon) VALUES (?, ?, ?, ?)`,
    args: [d.nama, d.alamat, d.kabupaten_kota, d.telepon],
  });
}

export async function setAktifMaster(
  tabel: 'wilayah_kerja' | 'poliklinik_non_bkk',
  id: number | string,
  aktif: boolean
) {
  await getDbClient().execute({ sql: `UPDATE ${tabel} SET aktif = ? WHERE id::text = ?`, args: [aktif, String(id)] });
}