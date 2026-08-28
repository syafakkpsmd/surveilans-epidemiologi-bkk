// lib/supabase/queries-karhutla-client.ts
import { createClient } from '@/lib/supabase/client';

/**
 * HANYA untuk dipanggil dari Client Component (form input, dsb).
 * File ini TIDAK boleh mengimpor apa pun dari lib/supabase/server.ts.
 */

// ------------------------------------------------------------
// Kasus ISPA — dipakai oleh form dashboard (admin) MAUPUN form
// publik (/form/ispa-harian). Upsert supaya idempotent: submit
// ulang untuk tanggal+wilayah yang sama akan meng-update, bukan
// membuat baris duplikat.
// ------------------------------------------------------------

export interface InputIspaHarian {
  tanggal: string;          // YYYY-MM-DD
  kode_wilker: string;
  zona: string | null;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  keterangan: string | null;
}

export async function simpanIspaHarian(input: InputIspaHarian) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ispa_harian')
    .upsert(
      {
        tanggal: input.tanggal,
        kode_wilker: input.kode_wilker,
        zona: input.zona,
        kasus_ispa_anak: input.kasus_ispa_anak,
        kasus_ispa_dewasa: input.kasus_ispa_dewasa,
        keterangan: input.keterangan,
      },
      { onConflict: 'tanggal,kode_wilker,zona' }
    )
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan data ISPA: ${error.message}`);
  return data;
}

/**
 * Hapus 1 baris kasus ISPA berdasarkan id (primary key).
 * Butuh RLS policy DELETE khusus admin/petugas di tabel ispa_harian
 * -- lihat sql/segmen-karhutla-rls-update-delete.sql.
 */
export async function hapusIspaHarian(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('ispa_harian').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus data ISPA: ${error.message}`);
}

// ------------------------------------------------------------
// Kualitas Udara — dipakai oleh form dashboard (admin) MAUPUN
// form publik (/form/lingkungan-harian). Upsert per tanggal+lokasi.
// ------------------------------------------------------------

export interface InputKualitasUdaraHarian {
  tanggal: string;
  lokasi: string;
  pm25: number | null;
  pm10: number | null;
  suhu: number | null;
  hcho: number | null;
  tvoc: number | null;
  kelembapan: number | null;
  ispu_status: string | null;
  catatan_evaluasi: string | null;
  status_evaluasi: string;
}

export async function simpanKualitasUdaraHarian(input: InputKualitasUdaraHarian) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('kualitas_udara_harian')
    .upsert(
      {
        tanggal: input.tanggal,
        lokasi: input.lokasi,
        pm25: input.pm25,
        pm10: input.pm10,
        suhu: input.suhu,
        hcho: input.hcho,
        tvoc: input.tvoc,
        kelembapan: input.kelembapan,
        ispu_status: input.ispu_status,
        catatan_evaluasi: input.catatan_evaluasi,
        status_evaluasi: input.status_evaluasi,
      },
      { onConflict: 'tanggal,lokasi' }
    )
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan data kualitas udara: ${error.message}`);
  return data;
}

/**
 * Hapus 1 baris kualitas udara berdasarkan id (primary key).
 * Butuh RLS policy DELETE khusus admin/petugas di tabel kualitas_udara_harian
 * -- lihat sql/segmen-karhutla-rls-update-delete.sql.
 */
export async function hapusKualitasUdaraHarian(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('kualitas_udara_harian').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus data kualitas udara: ${error.message}`);
}