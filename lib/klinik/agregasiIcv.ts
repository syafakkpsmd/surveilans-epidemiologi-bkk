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
    laki_laki: rows.filter((r) => r['Jenis Kelamin'] === 'Laki-laki').length,
    perempuan: rows.filter((r) => r['Jenis Kelamin'] === 'Perempuan').length,
    meningitis,
    flu,
    polio,
    yellow_fever: yf,
  };
}

export function donutJenisKelamin(rows: BarisIcv[]) {
  return hitungDistribusi(rows, (r) => (r['Jenis Kelamin'] as string) ?? 'Tidak diketahui');
}

export function donutUmur(rows: BarisIcv[]) {
  return hitungDistribusi(rows, (r) => kategoriUmur(hitungUmur(r['Tanggal Lahir'])));
}

export function donutJenisDokumenIcv(rows: BarisIcv[]) {
  // 1 baris ICV bisa terbit lebih dari 1 jenis vaksin -> dihitung per-dokumen, bukan per-orang
  const semuaVaksin = rows.flatMap((r) =>
    [r['Jenis Vaksin 1'], r['Jenis Vaksin 2'], r['Jenis Vaksin 3']].filter(Boolean)
  );
  return hitungDistribusi(semuaVaksin.map((v) => ({ __v: v })) as any, (r: any) => r.__v);
}

export function donutWus(rows: BarisIcv[]) {
  const perempuan = rows.filter((r) => r['Jenis Kelamin'] === 'Perempuan');
  return hitungDistribusi(perempuan, (r) => (r['Hasil WUS'] as string) || 'Tidak diisi');
}