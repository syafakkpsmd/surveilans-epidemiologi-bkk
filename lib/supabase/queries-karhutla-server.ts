import 'server-only'; // paksa error build kalau file ini kebawa ke client bundle
import { createClient } from '@/lib/supabase/server';

/**
 * HANYA untuk dipanggil dari Server Component / Route Handler / Server Action.
 * Jangan pernah import file ini dari komponen yang ada 'use client'.
 */

/**
 * wilayahKey: gabungan "kode_wilker" atau "kode_wilker::zona" (mis. "WK01::Palaran").
 * "Semua" atau undefined = tanpa filter (gabungan semua wilayah).
 */
export async function ambilTrenIspaPm25(opsi: { wilayahKey?: string; hariTerakhir?: number } = {}) {
  const { wilayahKey, hariTerakhir = 30 } = opsi;
  const supabase = await createClient();

  const sejakTanggal = new Date();
  sejakTanggal.setDate(sejakTanggal.getDate() - hariTerakhir);

  let query = supabase
    .from('karhutla_ispa_harian')
    .select('tanggal, kode_wilker, zona, kasus_ispa_anak, kasus_ispa_dewasa, pm25, ispu_status')
    .gte('tanggal', sejakTanggal.toISOString().slice(0, 10))
    .order('tanggal', { ascending: true });

  const isFilterSemua = !wilayahKey || wilayahKey === 'Semua';

  if (!isFilterSemua) {
    const [kodeWilker, zona] = wilayahKey.split('::');
    query = query.eq('kode_wilker', kodeWilker);
    // zona undefined di key berarti wilayah tanpa sub-zona (Sangatta, dst) -> filter zona IS NULL
    query = zona ? query.eq('zona', zona) : query.is('zona', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Gagal mengambil tren ISPA: ${error.message}`);
  if (!data) return [];

  if (isFilterSemua) {
    const map = new Map<string, { tanggal: string; kasus_ispa_anak: number; kasus_ispa_dewasa: number; totalPm25: number; jmlPm25: number }>();
    for (const baris of data) {
      const entri = map.get(baris.tanggal) ?? {
        tanggal: baris.tanggal,
        kasus_ispa_anak: 0,
        kasus_ispa_dewasa: 0,
        totalPm25: 0,
        jmlPm25: 0,
      };
      entri.kasus_ispa_anak += baris.kasus_ispa_anak;
      entri.kasus_ispa_dewasa += baris.kasus_ispa_dewasa;
      if (baris.pm25 != null) {
        entri.totalPm25 += Number(baris.pm25);
        entri.jmlPm25 += 1;
      }
      map.set(baris.tanggal, entri);
    }
    return Array.from(map.values()).map((e) => ({
      tanggal: e.tanggal,
      kasus_ispa_anak: e.kasus_ispa_anak,
      kasus_ispa_dewasa: e.kasus_ispa_dewasa,
      pm25_rerata: e.jmlPm25 > 0 ? Number((e.totalPm25 / e.jmlPm25).toFixed(1)) : null,
    }));
  }

  return data.map((d) => ({
    tanggal: d.tanggal,
    kasus_ispa_anak: d.kasus_ispa_anak,
    kasus_ispa_dewasa: d.kasus_ispa_dewasa,
    pm25_rerata: d.pm25 != null ? Number(d.pm25) : null,
  }));
}

export async function ambilHotspotCache(hariTerakhir = 3) {
  const supabase = await createClient();
  const sejakTanggal = new Date();
  sejakTanggal.setDate(sejakTanggal.getDate() - hariTerakhir);

  const { data, error } = await supabase
    .from('hotspot_nasa_kaltim')
    .select('*')
    .gte('tanggal_deteksi', sejakTanggal.toISOString().slice(0, 10))
    .order('tanggal_deteksi', { ascending: false });

  if (error) throw new Error(`Gagal mengambil cache hotspot: ${error.message}`);
  return data ?? [];
}