// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/dataFetchers.ts
// Ambil 12 baris terakhir per wilker dari masing-masing tabel mentah
// (bukan view ringkasan), persis pola fwk() di buildPromptAI_() GAS:
// "ambil 12 data survei terakhir untuk wilker ini".
// ================================================================

import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
// Mengembalikan path import ke yang asli dan valid sesuai struktur folder Anda
import type { WilkerRef, Database } from '@/types/database.types';

type NamaTabelValid =
  | keyof Database['public']['Tables']
  | keyof Database['public']['Views'];

export interface KonteksWilker {
  wilker: WilkerRef;
  musim: string;
}

export interface FilterTambahan {
  zona?: string;
  subLokasi?: string;
  vektorType?: 'lalat' | 'kecoa';
  tipeAno?: 'dewasa' | 'larva';
}

/** Sama seperti getMusimanKaltim_() di GAS — deskripsi musim berjalan. */
export function getMusimBerjalan(): string {
  const bulan = new Date().getMonth() + 1;
  if (bulan >= 6 && bulan <= 9) return 'Musim Kemarau — Risiko Anopheles & Tikus meningkat';
  if (bulan >= 11 || bulan <= 3) return 'Musim Penghujan — Risiko DBD & Diare meningkat';
  if (bulan === 4 || bulan === 5) return 'Peralihan Hujan→Kemarau — Waspadai lonjakan vektor';
  return 'Peralihan Kemarau→Hujan — Waspadai awal musim hujan';
}

export async function getWilkerByKode(kodeWilker: string): Promise<WilkerRef | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('wilker_ref').select('*').eq('kode', kodeWilker).single();
  return data ?? null;
}

/**
 * Ambil 12 baris terakhir dari tabel apa pun, difilter wilker (+opsional
 * filter tambahan seperti tipe_pengamatan/jenis_kegiatan), diurutkan dari
 * yang terbaru lalu dibalik supaya kronologis (lama -> baru) seperti GAS.
 */
export async function ambil12BarisTerakhir(params: {
  tabel: NamaTabelValid;
  kolomTanggal: string;
  kodeWilker: string;
  filterTambahan?: Record<string, string>;
}): Promise<Record<string, unknown>[]> {
  const { tabel, kolomTanggal, kodeWilker, filterTambahan } = params;
  const supabase = createServiceRoleClient();

  // Casting dinamis ganda agar lolos dari verifikasi strict tables/views Supabase
  let query = (supabase.from(tabel as any) as any)
    .select('*')
    .eq('kode_wilker', kodeWilker)
    .order(kolomTanggal, { ascending: false })
    .limit(12);

  if (filterTambahan) {
    for (const [kolom, nilai] of Object.entries(filterTambahan)) {
      // Membungkus 'kolom' dengan String() untuk menghindari error "Implicit conversion of a symbol"
      query = query.eq(String(kolom), nilai);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil data ${tabel}: ${error.message}`);

  return ((data ?? []) as Record<string, unknown>[]).reverse();
}