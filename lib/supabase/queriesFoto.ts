import { getDbClient } from '@/lib/db/client';

export interface JenisKegiatanFoto {
  id: number;
  nama: string;
}

export interface FotoKegiatan {
  id: number;
  judul: string;
  deskripsi: string | null;
  url: string;
  public_id: string;
  diupload_oleh: string | null;
  dibuat_pada: string;
  jenis_kegiatan_id: number | null;
  jenis_kegiatan_nama: string | null;
}

export async function getJenisKegiatanFoto(): Promise<JenisKegiatanFoto[]> {
  const { rows } = await getDbClient().execute('SELECT id, nama FROM jenis_kegiatan_foto ORDER BY nama ASC');
  return rows as JenisKegiatanFoto[];
}

export async function getGaleriFoto(limit?: number): Promise<FotoKegiatan[]> {
  const batas = limit ? ` LIMIT ${Math.max(1, Math.floor(Number(limit)))}` : '';
  const { rows } = await getDbClient().execute(
    `SELECT f.*, j.nama AS jenis_nama
       FROM foto_kegiatan f
       LEFT JOIN jenis_kegiatan_foto j ON j.id = f.jenis_kegiatan_id
      ORDER BY f.dibuat_pada DESC${batas}`
  );

  return rows.map((row: any) => ({
    id: row.id,
    judul: row.judul,
    deskripsi: row.deskripsi,
    url: row.url_gambar,
    public_id: row.public_id,
    diupload_oleh: row.diupload_oleh,
    dibuat_pada: row.dibuat_pada,
    jenis_kegiatan_id: row.jenis_kegiatan_id,
    jenis_kegiatan_nama: row.jenis_nama ?? null,
  }));
}