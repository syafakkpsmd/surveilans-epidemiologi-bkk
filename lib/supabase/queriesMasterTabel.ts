// ================================================================
// lib/supabase/queriesMasterTabel.ts
//
// Query pendukung khusus untuk modul "Master Tabel" (rekap gabungan
// Sanitasi & Vektor per wilayah kerja x bulan). Dataset Sanitasi (TTU/
// PAB/TPP) dan Rat Guard dipakai langsung dari fungsi yang sudah ada
// di lib/supabase/queries.ts (getRingkasanTtuBulanan dkk) -- baris di
// sana SUDAH per wilayah_kerja x bulan, tidak perlu fungsi baru.
//
// Dua fungsi di bawah ini melengkapi yang belum tersedia dalam bentuk
// "per wilayah kerja x bulan" siap pakai:
//  - getMasterVektorDbdAktivitasBulanan: rumah/kontainer diperiksa +
//    larvasida + pengasapan dari tabel vektor_dbd, dikelompokkan per
//    kode_wilker + zona + bulan (zona dibaca apa adanya dari data,
//    TIDAK di-hardcode, supaya cocok dengan nilai zona apa pun yang
//    tersimpan).
//  - getMasterVektorDiareBulananPerWilker: versi "belum diringkas
//    lintas wilayah" dari view_vektor_diare_bulanan (fungsi yang
//    sudah ada, getTrenDiareBulanan/getHasilPengamatanBulanan,
//    menggabung semua wilayah jadi satu baris per bulan kalau
//    kodeWilker tidak diisi -- di sini kita tetap pecah per wilayah).
// ================================================================

import { createClient } from './server';

export type BarisAktivitasDbd = {
  kode_wilker: string;
  zona: string;
  bulan: number;
  rumah_diperiksa: number;
  rumah_positif: number;
  container_diperiksa: number;
  container_positif: number;
  larvasida_gram: number;
  luas_fogging_ha: number;
  insektisida_fogging_ml: number;
};

export async function getMasterVektorDbdAktivitasBulanan(
  tahun: number,
  kodeWilker?: string
): Promise<BarisAktivitasDbd[]> {
  const supabase = await createClient();
  let query = supabase
    .from('vektor_dbd')
    .select(
      'tgl_survei, kode_wilker, zona, jml_rumah_diperiksa, jml_positif_jentik, container_diperiksa, container_positif, larvasida_gram, luas_wilayah_fogging_ha, jml_insektisida_fogging_ml'
    )
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil aktivitas DBD master tabel: ${error.message}`);

  const kelompok = new Map<string, BarisAktivitasDbd>();

  for (const row of data ?? []) {
    const d = new Date(row.tgl_survei);
    const bulan = d.getUTCMonth() + 1;
    const zona = row.zona || 'Tanpa Zona';
    const kode = row.kode_wilker || '—';
    const key = `${kode}|${zona}|${bulan}`;

    if (!kelompok.has(key)) {
      kelompok.set(key, {
        kode_wilker: kode,
        zona,
        bulan,
        rumah_diperiksa: 0,
        rumah_positif: 0,
        container_diperiksa: 0,
        container_positif: 0,
        larvasida_gram: 0,
        luas_fogging_ha: 0,
        insektisida_fogging_ml: 0,
      });
    }

    const g = kelompok.get(key)!;
    g.rumah_diperiksa += Number(row.jml_rumah_diperiksa) || 0;
    g.rumah_positif += Number(row.jml_positif_jentik) || 0;
    g.container_diperiksa += Number(row.container_diperiksa) || 0;
    g.container_positif += Number(row.container_positif) || 0;
    g.larvasida_gram += Number(row.larvasida_gram) || 0;
    g.luas_fogging_ha += Number(row.luas_wilayah_fogging_ha) || 0;
    g.insektisida_fogging_ml += Number(row.jml_insektisida_fogging_ml) || 0;
  }

  return Array.from(kelompok.values());
}

export type BarisDiareWilker = {
  kode_wilker: string;
  bulan: number;
  jml_pengamatan: number;
  jml_memenuhi_syarat: number;
  jml_tidak_memenuhi_syarat: number;
  indeks_rerata: number; // fly_index_rerata (lalat) ATAU kepadatan_kecoa_rerata (kecoa)
};

export async function getMasterVektorDiareBulananPerWilker(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string
): Promise<BarisDiareWilker[]> {
  const supabase = await createClient();
  const kolomIndeks = jenis === 'lalat' ? 'fly_index_rerata' : 'kepadatan_kecoa_rerata';

  let query = (supabase as any)
    .from('view_vektor_diare_bulanan')
    .select(`kode_wilker, bulan, jml_pengamatan, jml_memenuhi_syarat, ${kolomIndeks}`)
    .eq('tahun', tahun)
    .eq('jenis_kegiatan', jenis)
    .order('bulan');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil rekap Diare (${jenis}) per wilker: ${error.message}`);

  return (data ?? []).map((r: any) => {
    const pengamatan = Number(r.jml_pengamatan) || 0;
    const memenuhi = Number(r.jml_memenuhi_syarat) || 0;
    return {
      kode_wilker: r.kode_wilker || '—',
      bulan: Number(r.bulan) || 0,
      jml_pengamatan: pengamatan,
      jml_memenuhi_syarat: memenuhi,
      jml_tidak_memenuhi_syarat: Math.max(pengamatan - memenuhi, 0),
      indeks_rerata: Number(r[kolomIndeks]) || 0,
    };
  });
}
