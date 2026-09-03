// lib/klinik/agregasiTren.ts
import { periodeMingguanDariTanggal, periodeBulananDariTanggal, labelPeriodeMingguan, labelPeriodeBulanan } from '@/lib/ai/periode';
import type { BarisIcv } from './kepatuhan';
import type { BarisDatasetKlinik } from './dataset';
import { parseTanggalSheet } from './tanggal';

type Granularitas = 'mingguan' | 'bulanan';

function kunciPeriode(tgl: Date, granularitas: Granularitas): string {
  if (granularitas === 'mingguan') {
    const p = periodeMingguanDariTanggal(tgl);
    return `${p.tahun}-W${p.minggu}`;
  }
  const p = periodeBulananDariTanggal(tgl);
  return `${p.tahun}-${p.bulan}`;
}

function labelPeriode(key: string, granularitas: Granularitas): string {
  if (granularitas === 'mingguan') {
    const [tahun, minggu] = key.replace('W', '').split('-').map(Number);
    return labelPeriodeMingguan({ jenis: 'mingguan', tahun, minggu });
  }
  const [tahun, bulan] = key.split('-').map(Number);
  return labelPeriodeBulanan({ jenis: 'bulanan', tahun, bulan });
}

const ambilTanggal = (row: BarisIcv): Date | null => parseTanggalSheet(row['Tanggal Terbit']);

export function trenDistribusiGender(rows: BarisIcv[], granularitas: Granularitas) {
  const map = new Map<string, { laki_laki: number; perempuan: number }>();
  for (const row of rows) {
    const tgl = ambilTanggal(row);
    if (!tgl) continue; // <-- skip baris tanggal invalid
    const key = kunciPeriode(tgl, granularitas);
    const entry = map.get(key) ?? { laki_laki: 0, perempuan: 0 };
    if (row['Jenis Kelamin'] === 'Laki-laki') entry.laki_laki++;
    else if (row['Jenis Kelamin'] === 'Perempuan') entry.perempuan++;
    map.set(key, entry);
  }
  return Array.from(map, ([key, v]) => ({ periode: key, label: labelPeriode(key, granularitas), ...v }))
    .sort((a, b) => a.periode.localeCompare(b.periode));
}

export function trenLayananPerKlinik(dataset: BarisDatasetKlinik[], granularitas: Granularitas) {
  const map = new Map<string, Record<string, number>>();
  for (const d of dataset) {
    for (const row of d.icv) {
      const tgl = ambilTanggal(row);
      if (!tgl) continue;
      const key = kunciPeriode(tgl, granularitas);
      const entry = map.get(key) ?? {};
      entry[d.klinik.nama_klinik] = (entry[d.klinik.nama_klinik] ?? 0) + 1;
      map.set(key, entry);
    }
  }
  return Array.from(map, ([key, perKlinik]) => ({
    periode: key,
    label: labelPeriode(key, granularitas),
    total: Object.values(perKlinik).reduce((a, b) => a + b, 0),
    per_klinik: perKlinik,
  })).sort((a, b) => a.periode.localeCompare(b.periode));
}

export function trenPenerbitanIcv(rows: BarisIcv[], granularitas: Granularitas) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const jumlahDokumen = [row['Jenis Vaksin 1'], row['Jenis Vaksin 2'], row['Jenis Vaksin 3']].filter(Boolean).length;
    if (jumlahDokumen === 0) continue;
    const tgl = ambilTanggal(row);
    if (!tgl) continue;
    const key = kunciPeriode(tgl, granularitas);
    map.set(key, (map.get(key) ?? 0) + jumlahDokumen);
  }
  return Array.from(map, ([key, jumlah]) => ({ periode: key, label: labelPeriode(key, granularitas), jumlah }))
    .sort((a, b) => a.periode.localeCompare(b.periode));
}

const KATA_KUNCI_VAKSIN: Record<string, string> = {
  meningitis: 'Meningitis', flu: 'Flu', polio: 'Polio', yellow: 'Yellow Fever', yf: 'Yellow Fever',
};
const deteksiJenisVaksin = (nama: string) =>
  Object.entries(KATA_KUNCI_VAKSIN).find(([k]) => nama.toLowerCase().includes(k))?.[1] ?? nama;

export function trenPenerbitanPerVaksin(dataset: BarisDatasetKlinik[], granularitas: Granularitas) {
  const map = new Map<string, Map<string, Record<string, number>>>();

  for (const d of dataset) {
    for (const row of d.icv) {
      const tgl = ambilTanggal(row);
      if (!tgl) continue;
      const key = kunciPeriode(tgl, granularitas);
      const vaksinList = [row['Jenis Vaksin 1'], row['Jenis Vaksin 2'], row['Jenis Vaksin 3']].filter(Boolean) as string[];
      for (const v of vaksinList) {
        const jenis = deteksiJenisVaksin(v);
        const perJenis = map.get(key) ?? new Map();
        const perKlinik = perJenis.get(jenis) ?? {};
        perKlinik[d.klinik.nama_klinik] = (perKlinik[d.klinik.nama_klinik] ?? 0) + 1;
        perJenis.set(jenis, perKlinik);
        map.set(key, perJenis);
      }
    }
  }

  return Array.from(map, ([key, perJenis]) => ({
    periode: key,
    label: labelPeriode(key, granularitas),
    per_jenis_vaksin: Object.fromEntries(
      Array.from(perJenis, ([jenis, perKlinik]) => [
        jenis, { total: Object.values(perKlinik).reduce((a, b) => a + b, 0), per_klinik: perKlinik },
      ])
    ),
  })).sort((a, b) => a.periode.localeCompare(b.periode));
}