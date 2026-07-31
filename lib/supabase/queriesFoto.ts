import { createClient } from './server';

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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jenis_kegiatan_foto')
    .select('id, nama')
    .order('nama', { ascending: true });

  if (error) throw new Error(`Gagal ambil jenis kegiatan: ${error.message}`);
  return data ?? [];
}

export async function getGaleriFoto(limit?: number): Promise<FotoKegiatan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('foto_kegiatan')
    .select('*, jenis_kegiatan_foto(id, nama)')
    .order('dibuat_pada', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil galeri foto: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    judul: row.judul,
    deskripsi: row.deskripsi,
    url: row.url_gambar,
    public_id: row.public_id,
    diupload_oleh: row.diupload_oleh,
    dibuat_pada: row.dibuat_pada,
    jenis_kegiatan_id: row.jenis_kegiatan_id,
    jenis_kegiatan_nama: row.jenis_kegiatan_foto?.nama ?? null,
  }));
}