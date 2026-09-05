// lib/klinik/agregasiIcv.ts
import type { BarisIcv } from './kepatuhan';
import { parseTanggalSheet } from './tanggal';

function hitungUmur(tanggalLahir: any, padaTanggal: Date = new Date()): number | null {
  const lahir = parseTanggalSheet(tanggalLahir);
  if (!lahir) return null;
  let umur = padaTanggal.getFullYear() - lahir.getFullYear();
  const belumUlangTahun = padaTanggal.getMonth() < lahir.getMonth() ||
    (padaTanggal.getMonth() === lahir.getMonth() && padaTanggal.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}

function kategoriUmur(umur: number | null): 'Balita' | 'Anak' | 'Dewasa' | 'Lansia' | 'Tidak diketahui' {
  if (umur === null) return 'Tidak diketahui';
  if (umur <= 5) return 'Balita';
  if (umur <= 17) return 'Anak';
  if (umur <= 59) return 'Dewasa';
  return 'Lansia';
}

// Normalisasi Jenis Kelamin -- menangani variasi L/P, spasi, kapitalisasi
function normalisasiJenisKelamin(nilai: any): string {
  if (nilai === null || nilai === undefined) return 'Tidak diketahui';
  const n = String(nilai).trim().toLowerCase();
  if (!n) return 'Tidak diketahui';
  if (n === 'l' || n.startsWith('laki')) return 'Laki-laki';
  if (n === 'p' || n.startsWith('perempuan')) return 'Perempuan';
  return 'Tidak diketahui'; // nilai lain yang tidak dikenali, digabung ke sini (bukan bikin kategori baru)
}

// Normalisasi nama vaksin -- 1 label kanonik per jenis, tidak peduli variasi kapitalisasi/spasi
const LABEL_VAKSIN_KANONIK: Record<string, string> = {
  meningitis: 'Meningitis',
  flu: 'Flu',
  influenza: 'Influenza',
  polio: 'Polio',
  yellowfever: 'Yellow Fever',
  yf: 'Yellow Fever',
  pneumokokus: 'Pneumokokus',
  tdap: 'Tdap',
  tifoid: 'Tifoid',
  varicella: 'Varicella',
  mmr: 'MMR',
};

function normalisasiNamaVaksin(nilai: any): string {
  if (!nilai) return 'Tidak diketahui';
  const kunci = String(nilai).trim().toLowerCase().replace(/[\s_-]+/g, '');
  return LABEL_VAKSIN_KANONIK[kunci] ?? String(nilai).trim();
}

function hitungDistribusi<T extends string>(rows: BarisIcv[], ambilKategori: (row: BarisIcv) => T) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const kategori = ambilKategori(row) || 'Tidak diketahui';
    map.set(kategori, (map.get(kategori) ?? 0) + 1);
  }
  return Array.from(map, ([kategori, jumlah]) => ({ kategori, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

export function ringkasanKartuIcv(rows: BarisIcv[]) {
  const jenisVaksinTerbit = (row: BarisIcv) =>
    [row['Jenis Vaksin 1'], row['Jenis Vaksin 2'], row['Jenis Vaksin 3']].filter(Boolean) as string[];

  let meningitis = 0, flu = 0, polio = 0, yf = 0;
  for (const row of rows) {
    for (const v of jenisVaksinTerbit(row)) {
      const nama = v.toLowerCase();
      if (nama.includes('meningitis')) meningitis++;
      else if (nama.includes('flu')) flu++;
      else if (nama.includes('polio')) polio++;
      else if (nama.includes('yellow') || nama.includes('yf')) yf++;
    }
  }

  return {
    total_layanan: rows.length,
    laki_laki: rows.filter((r) => normalisasiJenisKelamin(r['Jenis Kelamin']) === 'Laki-laki').length,
    perempuan: rows.filter((r) => normalisasiJenisKelamin(r['Jenis Kelamin']) === 'Perempuan').length,
    meningitis,
    flu,
    polio,
    yellow_fever: yf,
  };
}

export function donutJenisKelamin(rows: BarisIcv[]) {
  return hitungDistribusi(rows, (r) => normalisasiJenisKelamin(r['Jenis Kelamin']));
}

export function donutUmur(rows: BarisIcv[]) {
  return hitungDistribusi(rows, (r) => kategoriUmur(hitungUmur(r['Tanggal Lahir'])));
}

export function donutJenisDokumenIcv(rows: BarisIcv[]) {
  const semuaVaksin = rows.flatMap((r) =>
    [r['Jenis Vaksin 1'], r['Jenis Vaksin 2'], r['Jenis Vaksin 3']].filter(Boolean)
  );
  return hitungDistribusi(
    semuaVaksin.map((v) => ({ __v: normalisasiNamaVaksin(v) })) as any,
    (r: any) => r.__v
  );
}

export function donutWus(rows: BarisIcv[]) {
  const wusYa = rows.filter((r) => 
    (r['Jenis Kelamin'] as string) === 'Perempuan' && r['WUS'] === 'Ya'
  );
  return hitungDistribusi(wusYa, (r) => (r['Hasil WUS'] as string) || 'Belum Diperiksa');
}