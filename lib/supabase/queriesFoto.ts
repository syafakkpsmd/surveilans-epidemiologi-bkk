import { createClient } from './server';

export interface FotoKegiatan {
  id: number;
  judul: string;
  deskripsi: string | null;
  url: string;
  public_id: string;
  diupload_oleh: string | null;
  dibuat_pada: string;
}

export async function getGaleriFoto(limit?: number): Promise<FotoKegiatan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('foto_kegiatan')
    .select('*')
    .order('dibuat_pada', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil galeri foto: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    judul: row.judul,
    deskripsi: row.deskripsi,
    url: row.url_gambar,
    public_id: row.public_id,
    diupload_oleh: row.diupload_oleh,
    dibuat_pada: row.dibuat_pada,
  }));
}