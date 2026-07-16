// ================================================================
// lib/supabase/queriesVektorBreakdown.ts
// ================================================================

import { createClient } from './server';

export function getRentangMingguEpid(
  tahun: number,
  mingguEpid: number
): { mulai: string; selesai: string } {
  const jan1 = new Date(Date.UTC(tahun, 0, 1));
  const hariJan1 = jan1.getUTCDay();
  const mingguPertamaMulai = new Date(jan1);
  mingguPertamaMulai.setUTCDate(jan1.getUTCDate() - hariJan1);

  const mulai = new Date(mingguPertamaMulai);
  mulai.setUTCDate(mingguPertamaMulai.getUTCDate() + (mingguEpid - 1) * 7);

  const selesai = new Date(mulai);
  selesai.setUTCDate(mulai.getUTCDate() + 6);

  return {
    mulai: mulai.toISOString().split('T')[0],
    selesai: selesai.toISOString().split('T')[0],
  };
}

export async function getBreakdownKategori(params: {
  tabel: string;
  kolomTanggal: string;
  kolomKategori: string;
  tglMulai: string;
  tglSelesai: string;
  kodeWilker?: string;
  filterTambahan?: Record<string, string>;
}): Promise<{ kategori: string; jumlah: number }[]> {
  const { tabel, kolomTanggal, kolomKategori, tglMulai, tglSelesai, kodeWilker, filterTambahan } =
    params;

  const supabase = await createClient();
  let query = supabase
    .from(tabel)
    .select(kolomKategori)
    .gte(kolomTanggal, tglMulai)
    .lte(kolomTanggal, tglSelesai);

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);
  if (filterTambahan) {
    for (const [kolom, nilai] of Object.entries(filterTambahan)) {
      query = query.eq(kolom, nilai);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil breakdown ${tabel}.${kolomKategori}: ${error.message}`);

  const hitung = new Map<string, number>();
  const dataArray = Array.isArray(data) ? data : [];
  for (const row of dataArray) {
    const rowObj = row as Record<string, any>;
    const nilaiRaw = rowObj[kolomKategori];
    const nilai = nilaiRaw !== null && nilaiRaw !== undefined ? String(nilaiRaw) : '—';
    hitung.set(nilai, (hitung.get(nilai) ?? 0) + 1);
  }

  return Array.from(hitung.entries())
    .map(([kategori, jumlah]) => ({ kategori, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

export async function getRingkasanVektorDbdRentang(filter: {
  tahun: number;
  mgDari?: number;
  mgSampai?: number;
  kodeWilker?: string;
  zona?: string;
  subLokasi?: string;
}): Promise<
  {
    minggu_epid: string;
    hi_rerata: number;
    ci_rerata: number;
    bi_rerata: number;
    abj_rerata: number;
    curah_hujan_rerata: number | null;
  }[]
> {
  const { tahun, mgDari, mgSampai, kodeWilker, zona, subLokasi } = filter;
  const supabase = await createClient();

  let tglMulai: string;
  let tglSelesai: string;

  if (mgDari && mgSampai) {
    tglMulai = getRentangMingguEpid(tahun, mgDari).mulai;
    tglSelesai = getRentangMingguEpid(tahun, mgSampai).selesai;
  } else {
    tglMulai = `${tahun}-01-01`;
    tglSelesai = `${tahun}-12-31`;
  }

  let query = supabase
    .from('vektor_dbd')
    .select('tgl_survei, minggu_epid, kode_wilker, zona, sub_lokasi, hi, ci, bi, abj, curah_hujan_mm')
    .gte('tgl_survei', tglMulai)
    .lte('tgl_survei', tglSelesai)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);
  if (zona) query = query.eq('zona', zona);
  if (subLokasi) query = query.eq('sub_lokasi', subLokasi);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan DBD rentang: ${error.message}`);

  const kelompokMinggu = new Map<
    string,
    { hi: number[]; ci: number[]; bi: number[]; abj: number[]; curah: number[] }
  >();

  for (const row of data ?? []) {
    const key = row.minggu_epid ?? '—';
    if (!kelompokMinggu.has(key)) kelompokMinggu.set(key, { hi: [], ci: [], bi: [], abj: [], curah: [] });
    const g = kelompokMinggu.get(key)!;
    if (row.hi !== null) g.hi.push(row.hi);
    if (row.ci !== null) g.ci.push(row.ci);
    if (row.bi !== null) g.bi.push(row.bi);
    if (row.abj !== null) g.abj.push(row.abj);
    if (row.curah_hujan_mm !== null) g.curah.push(row.curah_hujan_mm);
  }

  const rerataMinggu = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return Array.from(kelompokMinggu.entries())
    .map(([minggu_epid, g]) => ({
      minggu_epid,
      hi_rerata: rerataMinggu(g.hi),
      ci_rerata: rerataMinggu(g.ci),
      bi_rerata: rerataMinggu(g.bi),
      abj_rerata: rerataMinggu(g.abj),
      curah_hujan_rerata: g.curah.length ? rerataMinggu(g.curah) : null,
    }))
    .sort((a, b) => Number(a.minggu_epid) - Number(b.minggu_epid));
}

export async function getRingkasanVektorDbdBulanan(filter: {
  tahun: number;
  kodeWilker?: string;
  zona?: string;
  subLokasi?: string;
  bulanDari?: string;
  bulanSampai?: string;
}): Promise<
  {
    bulanLabel: string;
    hi_rerata: number;
    ci_rerata: number;
    bi_rerata: number;
    abj_rerata: number;
    curah_hujan_rerata: number | null;
  }[]
> {
  const { tahun, kodeWilker, zona, subLokasi, bulanDari, bulanSampai } = filter;
  const supabase = await createClient();

  let tglMulai: string;
  let tglSelesai: string;

  if (bulanDari && bulanSampai) {
    tglMulai = `${bulanDari}-01`;
    const [thnSampai, blnSampai] = bulanSampai.split('-').map(Number);
    tglSelesai = new Date(Date.UTC(thnSampai, blnSampai, 0)).toISOString().split('T')[0];
  } else {
    tglMulai = `${tahun}-01-01`;
    tglSelesai = `${tahun}-12-31`;
  }

  let query = supabase
    .from('vektor_dbd')
    .select('tgl_survei, hi, ci, bi, abj, curah_hujan_mm')
    .gte('tgl_survei', tglMulai)
    .lte('tgl_survei', tglSelesai)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);
  if (zona) query = query.eq('zona', zona);
  if (subLokasi) query = query.eq('sub_lokasi', subLokasi);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan DBD bulanan: ${error.message}`);

  const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const kelompokBulan = new Map<
    string,
    { hi: number[]; ci: number[]; bi: number[]; abj: number[]; curah: number[] }
  >();

  for (const row of data ?? []) {
    const d = new Date(row.tgl_survei);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!kelompokBulan.has(key)) kelompokBulan.set(key, { hi: [], ci: [], bi: [], abj: [], curah: [] });
    const g = kelompokBulan.get(key)!;
    if (row.hi !== null) g.hi.push(row.hi);
    if (row.ci !== null) g.ci.push(row.ci);
    if (row.bi !== null) g.bi.push(row.bi);
    if (row.abj !== null) g.abj.push(row.abj);
    if (row.curah_hujan_mm !== null) g.curah.push(row.curah_hujan_mm);
  }

  const rerataBulan = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return Array.from(kelompokBulan.entries())
    .sort(([a], [b]) => {
      const [ta, ba] = a.split('-').map(Number);
      const [tb, bb] = b.split('-').map(Number);
      return ta - tb || ba - bb;
    })
    .map(([key, g]) => {
      const [thn, bln] = key.split('-').map(Number);
      return {
        bulanLabel: `${namaBulan[bln]} ${thn}`,
        hi_rerata: rerataBulan(g.hi),
        ci_rerata: rerataBulan(g.ci),
        bi_rerata: rerataBulan(g.bi),
        abj_rerata: rerataBulan(g.abj),
        curah_hujan_rerata: g.curah.length ? rerataBulan(g.curah) : null,
      };
    });
}

// ================================================================
// Ringkasan AKTIVITAS: rumah diperiksa, container diperiksa,
// rumah/container positif, larvasida, luas wilayah fogging,
// insektisida fogging.
// ================================================================

export type AktivitasMingguan = {
  minggu_epid: string;
  rumah_diperiksa: number;
  rumah_positif: number;
  container_diperiksa: number;
  container_positif: number;
};

export async function getRingkasanVektorAktivitasMingguan(filter: {
  tahun: number;
  mgDari?: number;
  mgSampai?: number;
  kodeWilker?: string;
  zona?: string;
  subLokasi?: string;
}): Promise<AktivitasMingguan[]> {
  const { tahun, mgDari, mgSampai, kodeWilker, zona, subLokasi } = filter;
  const supabase = await createClient();

  let tglMulai: string;
  let tglSelesai: string;
  if (mgDari && mgSampai) {
    tglMulai = getRentangMingguEpid(tahun, mgDari).mulai;
    tglSelesai = getRentangMingguEpid(tahun, mgSampai).selesai;
  } else {
    tglMulai = `${tahun}-01-01`;
    tglSelesai = `${tahun}-12-31`;
  }

  let query = supabase
    .from('vektor_dbd')
    .select('minggu_epid, jml_rumah_diperiksa, jml_positif_jentik, container_diperiksa, container_positif')
    .gte('tgl_survei', tglMulai)
    .lte('tgl_survei', tglSelesai)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);
  if (zona) query = query.eq('zona', zona);
  if (subLokasi) query = query.eq('sub_lokasi', subLokasi);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan aktivitas vektor mingguan: ${error.message}`);

  const kelompok = new Map<string, AktivitasMingguan>();
  for (const row of data ?? []) {
    const key = String(row.minggu_epid ?? '—');
    if (!kelompok.has(key)) {
      kelompok.set(key, {
        minggu_epid: key,
        rumah_diperiksa: 0,
        rumah_positif: 0,
        container_diperiksa: 0,
        container_positif: 0,
      });
    }
    const g = kelompok.get(key)!;
    g.rumah_diperiksa += Number(row.jml_rumah_diperiksa) || 0;
    g.rumah_positif += Number(row.jml_positif_jentik) || 0;
    g.container_diperiksa += Number(row.container_diperiksa) || 0;
    g.container_positif += Number(row.container_positif) || 0;
  }

  return Array.from(kelompok.values()).sort((a, b) => Number(a.minggu_epid) - Number(b.minggu_epid));
}

export type AktivitasBulanan = {
  bulanLabel: string;
  rumah_diperiksa: number;
  rumah_positif: number;
  container_diperiksa: number;
  container_positif: number;
  larvasida_gram: number;
  luas_wilayah_fogging_ha: number;
  jml_insektisida_fogging_ml: number;
};

export async function getRingkasanVektorAktivitasBulanan(filter: {
  tahun: number;
  kodeWilker?: string;
  zona?: string;
  subLokasi?: string;
  bulanDari?: string;
  bulanSampai?: string;
}): Promise<AktivitasBulanan[]> {
  const { tahun, kodeWilker, zona, subLokasi, bulanDari, bulanSampai } = filter;
  const supabase = await createClient();

  let tglMulai: string;
  let tglSelesai: string;
  if (bulanDari && bulanSampai) {
    tglMulai = `${bulanDari}-01`;
    const [thnSampai, blnSampai] = bulanSampai.split('-').map(Number);
    tglSelesai = new Date(Date.UTC(thnSampai, blnSampai, 0)).toISOString().split('T')[0];
  } else {
    tglMulai = `${tahun}-01-01`;
    tglSelesai = `${tahun}-12-31`;
  }

  let query = supabase
    .from('vektor_dbd')
    .select(
      'tgl_survei, jml_rumah_diperiksa, jml_positif_jentik, container_diperiksa, container_positif, larvasida_gram, luas_wilayah_fogging_ha, jml_insektisida_fogging_ml'
    )
    .gte('tgl_survei', tglMulai)
    .lte('tgl_survei', tglSelesai)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);
  if (zona) query = query.eq('zona', zona);
  if (subLokasi) query = query.eq('sub_lokasi', subLokasi);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan aktivitas vektor bulanan: ${error.message}`);

  const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const kelompok = new Map<string, AktivitasBulanan>();

  for (const row of data ?? []) {
    const d = new Date(row.tgl_survei);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!kelompok.has(key)) {
      kelompok.set(key, {
        bulanLabel: `${namaBulan[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        rumah_diperiksa: 0,
        rumah_positif: 0,
        container_diperiksa: 0,
        container_positif: 0,
        larvasida_gram: 0,
        luas_wilayah_fogging_ha: 0,
        jml_insektisida_fogging_ml: 0,
      });
    }
    const g = kelompok.get(key)!;
    g.rumah_diperiksa += Number(row.jml_rumah_diperiksa) || 0;
    g.rumah_positif += Number(row.jml_positif_jentik) || 0;
    g.container_diperiksa += Number(row.container_diperiksa) || 0;
    g.container_positif += Number(row.container_positif) || 0;
    g.larvasida_gram += Number(row.larvasida_gram) || 0;
    g.luas_wilayah_fogging_ha += Number(row.luas_wilayah_fogging_ha) || 0;
    g.jml_insektisida_fogging_ml += Number(row.jml_insektisida_fogging_ml) || 0;
  }

  return Array.from(kelompok.entries())
    .sort(([a], [b]) => {
      const [ta, ba] = a.split('-').map(Number);
      const [tb, bb] = b.split('-').map(Number);
      return ta - tb || ba - bb;
    })
    .map(([, v]) => v);
}