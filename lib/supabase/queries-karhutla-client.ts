import { createClient } from '@/lib/supabase/client';

/**
 * HANYA untuk dipanggil dari Client Component (form input, dsb).
 * File ini TIDAK boleh mengimpor apa pun dari lib/supabase/server.ts.
 */

export interface InputIspaHarian {
  tanggal: string;          // YYYY-MM-DD
  kode_wilker: string;
  zona: string | null;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  pm25: number | null;
  ispu_status: string | null;
  keterangan: string | null;
}

export async function simpanIspaHarian(input: InputIspaHarian) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('karhutla_ispa_harian')
    .insert({
      tanggal: input.tanggal,
      kode_wilker: input.kode_wilker,
      zona: input.zona,
      kasus_ispa_anak: input.kasus_ispa_anak,
      kasus_ispa_dewasa: input.kasus_ispa_dewasa,
      pm25: input.pm25,
      ispu_status: input.ispu_status,
      keterangan: input.keterangan,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Data untuk tanggal dan wilayah ini sudah pernah diinput. Silakan edit data yang sudah ada.');
    }
    throw new Error(`Gagal menyimpan data: ${error.message}`);
  }

  return data;
}

// ------------------------------------------------------------
// Form terpisah (link publik): ISPA saja & Lingkungan saja.
// Pakai UPSERT per-kolom supaya dua form tidak saling menimpa
// data punya form yang lain untuk tanggal+wilayah yang sama.
// ------------------------------------------------------------

export interface InputIspaSaja {
  tanggal: string;
  kode_wilker: string;
  zona: string | null;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  keterangan_ispa: string | null;
}

export async function simpanIspaSaja(input: InputIspaSaja) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('karhutla_ispa_harian')
    .upsert(
      {
        tanggal: input.tanggal,
        kode_wilker: input.kode_wilker,
        zona: input.zona,
        kasus_ispa_anak: input.kasus_ispa_anak,
        kasus_ispa_dewasa: input.kasus_ispa_dewasa,
        keterangan_ispa: input.keterangan_ispa,
      },
      { onConflict: 'tanggal,kode_wilker,zona' }
    )
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan data ISPA: ${error.message}`);
  return data;
}

export interface InputLingkunganSaja {
  tanggal: string;
  kode_wilker: string;
  zona: string | null;
  pm25: number | null;
  ispu_status: string | null;
  keterangan_lingkungan: string | null;
}

export async function simpanLingkunganSaja(input: InputLingkunganSaja) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('karhutla_ispa_harian')
    .upsert(
      {
        tanggal: input.tanggal,
        kode_wilker: input.kode_wilker,
        zona: input.zona,
        pm25: input.pm25,
        ispu_status: input.ispu_status,
        keterangan_lingkungan: input.keterangan_lingkungan,
      },
      { onConflict: 'tanggal,kode_wilker,zona' }
    )
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan data lingkungan: ${error.message}`);
  return data;
}