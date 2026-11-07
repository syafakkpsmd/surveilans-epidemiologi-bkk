// lib/udara-ruang/hitung.ts  (FILE BARU)
// Penilaian dan agregasi pengukuran kualitas udara dalam ruang. MURNI: dipakai server dan klien (filter di dasbor).
//
// Status satu pengukuran (urutan prioritas):
//   ANOMALI        : ada nilai di luar rentang wajar parameternya (mis. HCHO 191 ppm: hampir pasti satuan µg/m³ atau salah ketik)
//   BELUM_LENGKAP  : ada parameter wajib-lengkap yang kosong (meniru status Karhutla "Data Belum Lengkap"; angka 0 dianggap terisi)
//   TMS            : ada parameter ber-baku-mutu yang melampaui batas
//   MS             : selebihnya
// Parameter tanpa baku mutu tunggal (TVOC, SO2, NO2, O3) disimpan dan ditampilkan tetapi TIDAK ikut menentukan MS/TMS.
// Nilai anomali dikeluarkan dari semua rata-rata.
import { PARAMETER, kolomDb, type KunciParam } from './parameter';

export type StatusUdara = 'MS' | 'TMS' | 'BELUM_LENGKAP' | 'ANOMALI';
export const URUTAN_STATUS: StatusUdara[] = ['MS', 'TMS', 'BELUM_LENGKAP', 'ANOMALI'];
export const LABEL_STATUS: Record<StatusUdara, string> = {
  MS: 'Memenuhi Syarat', TMS: 'Tidak Memenuhi Syarat', BELUM_LENGKAP: 'Data Belum Lengkap', ANOMALI: 'Perlu Diperiksa',
};

export type BarisUdara = {
  id: string | number;
  tanggal: string; // 'YYYY-MM-DD'
  lokasi: string | null;
  wilayah_kerja: string | null;
  nama_pelabuhan: string | null;
  nama_gedung: string | null;
  nama_ruangan: string | null;
  fungsi_ruangan: string | null;
  sumber: string | null;
  kesimpulan: string | null;
  rekomendasi: string | null;
  /** Dihitung server (minggu epidemiologi), supaya klien tidak bergantung pada lib/epi-week. */
  minggu: number;
  tahun_epid: number;
} & Record<KunciParam, number | null>;

export const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const ada = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const bulanDari = (tgl: string) => Number(tgl.slice(5, 7)) || 0;
const bulat = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export interface Penilaian { status: StatusUdara; melampaui: KunciParam[]; kosong: KunciParam[]; anomali: KunciParam[] }

export function nilaiBaris(b: BarisUdara): Penilaian {
  const melampaui: KunciParam[] = [], kosong: KunciParam[] = [], anomali: KunciParam[] = [];
  for (const p of PARAMETER) {
    const v = b[p.kunci];
    if (!ada(v)) { if (p.wajibLengkap) kosong.push(p.kunci); continue; }
    if (v < p.rentangWajar[0] || v > p.rentangWajar[1]) { anomali.push(p.kunci); continue; }
    if (p.dinilai && ((p.min !== undefined && v < p.min) || (p.max !== undefined && v > p.max))) melampaui.push(p.kunci);
  }
  const status: StatusUdara = anomali.length ? 'ANOMALI' : kosong.length ? 'BELUM_LENGKAP' : melampaui.length ? 'TMS' : 'MS';
  return { status, melampaui, kosong, anomali };
}

/** Nilai yang layak masuk rata-rata (ada dan tidak anomali). */
function nilaiSah(b: BarisUdara, k: KunciParam): number | null {
  const p = PARAMETER.find((x) => x.kunci === k)!;
  const v = b[k];
  return ada(v) && v >= p.rentangWajar[0] && v <= p.rentangWajar[1] ? v : null;
}

function rata(rows: BarisUdara[], k: KunciParam, desimal: number): number | null {
  const n = rows.map((r) => nilaiSah(r, k)).filter((x): x is number => x !== null);
  return n.length ? bulat(n.reduce((a, x) => a + x, 0) / n.length, desimal) : null;
}

/** Wilayah kerja sebuah baris: kolom wilayah_kerja bila ada; bila belum terisi (data lama), cocokkan awalan teks Lokasi dengan daftar wilayah. */
export function wilkerBaris(b: BarisUdara, daftarWilayah: string[]): string | null {
  if (b.wilayah_kerja) return b.wilayah_kerja;
  const l = (b.lokasi ?? '').toLowerCase();
  return [...daftarWilayah].sort((a, c) => c.length - a.length).find((w) => l.startsWith(w.toLowerCase())) ?? null;
}

/** Label lokasi untuk pengelompokan: teks Lokasi Karhutla, atau pelabuhan/wilayah bila kosong. */
export const lokasiLabel = (b: BarisUdara): string => b.lokasi || b.nama_pelabuhan || b.wilayah_kerja || 'Tanpa lokasi';

export interface Ringkasan {
  total: number; lokasi: number; jumlah: Record<StatusUdara, number>;
  persenMs: number | null; // MS / (MS + TMS) dari pengukuran yang lengkap dan wajar
  tanggalTerakhir: string | null;
  parameterDominan: { kunci: KunciParam; nama: string; jumlah: number } | null;
}

export function hitungRingkasan(rows: BarisUdara[]): Ringkasan {
  const jumlah: Record<StatusUdara, number> = { MS: 0, TMS: 0, BELUM_LENGKAP: 0, ANOMALI: 0 };
  const lompat = new Map<KunciParam, number>();
  for (const r of rows) {
    const n = nilaiBaris(r);
    jumlah[n.status]++;
    for (const k of n.melampaui) lompat.set(k, (lompat.get(k) ?? 0) + 1);
  }
  const top = [...lompat.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    total: rows.length,
    lokasi: new Set(rows.map(lokasiLabel)).size,
    jumlah,
    persenMs: jumlah.MS + jumlah.TMS > 0 ? (jumlah.MS / (jumlah.MS + jumlah.TMS)) * 100 : null,
    tanggalTerakhir: rows.reduce<string | null>((m, r) => (m === null || r.tanggal > m ? r.tanggal : m), null),
    parameterDominan: top ? { kunci: top[0], nama: PARAMETER.find((p) => p.kunci === top[0])!.nama, jumlah: top[1] } : null,
  };
}

export type Granularitas = 'mingguan' | 'bulanan';

export interface TitikPeriode {
  name: string; label: string; urutan: number; n: number;
  pm25: number | null; pm10: number | null; suhu: number | null; kelembapan: number | null; hcho: number | null; tvoc: number | null;
  ms: number; tms: number; belum_lengkap: number; anomali: number;
  bm_pm25: number; bm_pm10: number; bm_hcho: number;
}

export function trenPeriode(rows: BarisUdara[], gran: Granularitas): TitikPeriode[] {
  const peta = new Map<number, { label: string; rows: BarisUdara[] }>();
  for (const r of rows) {
    const urutan = gran === 'bulanan' ? bulanDari(r.tanggal) : r.tahun_epid * 100 + r.minggu;
    if (!urutan) continue;
    const label = gran === 'bulanan' ? NAMA_BULAN_PENDEK[bulanDari(r.tanggal) - 1] : `Mg-${r.minggu}`;
    const g = peta.get(urutan) ?? { label, rows: [] };
    g.rows.push(r);
    peta.set(urutan, g);
  }
  const bm = (k: KunciParam) => PARAMETER.find((p) => p.kunci === k)!.max ?? 0;
  return [...peta.entries()].sort((a, b) => a[0] - b[0]).map(([urutan, g]) => {
    const st = hitungRingkasan(g.rows).jumlah;
    return {
      name: g.label, label: g.label, urutan, n: g.rows.length,
      pm25: rata(g.rows, 'pm25', 1), pm10: rata(g.rows, 'pm10', 1), suhu: rata(g.rows, 'suhu', 1),
      kelembapan: rata(g.rows, 'kelembapan', 1), hcho: rata(g.rows, 'hcho', 3), tvoc: rata(g.rows, 'tvoc', 3),
      ms: st.MS, tms: st.TMS, belum_lengkap: st.BELUM_LENGKAP, anomali: st.ANOMALI,
      bm_pm25: bm('pm25'), bm_pm10: bm('pm10'), bm_hcho: bm('hcho'),
    };
  });
}

export interface BarisLokasi {
  name: string; label: string; n: number; wilayah: string | null;
  rata: Partial<Record<KunciParam, number | null>>;
  ms: number; tms: number; belum_lengkap: number; anomali: number;
  pm25: number; bm_pm25: number;
}

export function perLokasi(rows: BarisUdara[], daftarWilayah: string[]): BarisLokasi[] {
  const peta = new Map<string, BarisUdara[]>();
  for (const r of rows) peta.set(lokasiLabel(r), [...(peta.get(lokasiLabel(r)) ?? []), r]);
  const bmPm25 = PARAMETER.find((p) => p.kunci === 'pm25')!.max!;
  return [...peta.entries()].map(([lokasi, rs]) => {
    const st = hitungRingkasan(rs).jumlah;
    const rataParam: Partial<Record<KunciParam, number | null>> = {};
    for (const p of PARAMETER) rataParam[p.kunci] = rata(rs, p.kunci, p.kunci === 'hcho' || p.kunci === 'tvoc' ? 3 : 1);
    return {
      name: lokasi, label: lokasi, n: rs.length, wilayah: wilkerBaris(rs[0], daftarWilayah), rata: rataParam,
      ms: st.MS, tms: st.TMS, belum_lengkap: st.BELUM_LENGKAP, anomali: st.ANOMALI,
      pm25: rataParam.pm25 ?? 0, bm_pm25: bmPm25,
    };
  }).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}

export interface KepatuhanParam { name: string; label: string; kunci: KunciParam; terukur: number; melampaui: number; persen_memenuhi: number }

/** % pengukuran yang memenuhi baku mutu per parameter yang dinilai otomatis (nilai kosong/anomali tidak dihitung). */
export function kepatuhanParameter(rows: BarisUdara[]): KepatuhanParam[] {
  return PARAMETER.filter((p) => p.dinilai).map((p) => {
    let terukur = 0, melampaui = 0;
    for (const r of rows) {
      const v = nilaiSah(r, p.kunci);
      if (v === null) continue;
      terukur++;
      if ((p.min !== undefined && v < p.min) || (p.max !== undefined && v > p.max)) melampaui++;
    }
    const nama = p.nama.replace(/\s*\(.*\)$/, '');
    return { name: nama, label: nama, kunci: p.kunci, terukur, melampaui, persen_memenuhi: terukur ? bulat(((terukur - melampaui) / terukur) * 100, 1) : 0 };
  }).filter((x) => x.terukur > 0);
}

/** Kode status yang disimpan Karhutla di kolom status_evaluasi (nilai sama dengan data lama).
 *  BELUM_DIUJI = enam parameter wajib kosong semua; TIDAK_LENGKAP = sebagian kosong (diutamakan atas TMS); 0 dianggap terisi. */
export function statusEvaluasi(n: Record<string, string | number | null>): 'MS' | 'TMS' | 'TIDAK_LENGKAP' | 'BELUM_DIUJI' {
  let kosong = 0, wajib = 0, lewat = false;
  for (const p of PARAMETER) {
    const v = n[kolomDb(p.kunci)];
    const isi = v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
    if (p.wajibLengkap) { wajib++; if (!isi) kosong++; }
    if (isi && p.dinilai && ((p.min !== undefined && Number(v) < p.min) || (p.max !== undefined && Number(v) > p.max))) lewat = true;
  }
  if (kosong === wajib) return 'BELUM_DIUJI';
  if (kosong > 0) return 'TIDAK_LENGKAP';
  return lewat ? 'TMS' : 'MS';
}
