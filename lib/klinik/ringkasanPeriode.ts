// lib/klinik/ringkasanPeriode.ts
import { getDatasetKlinik } from './dataset';
import { hitungKepatuhanVaksin } from './kepatuhan';
import { periodeMingguanDariTanggal, periodeBulananDariTanggal } from '@/lib/ai/periode';
import { parseTanggalSheet } from './tanggal';
import { getStandarHariVaksin } from './pengaturan';
import { komorbidKosong, deteksiKomorbid } from './komorbid';

function deteksiJenis(nama: string) {
  const n = nama.toLowerCase();
  if (n.includes('meningitis')) return 'meningitis';
  if (n.includes('flu')) return 'flu';
  if (n.includes('polio')) return 'polio';
  if (n.includes('yellow') || n === 'yf') return 'yellow_fever';
  return null;
}

async function ringkasanPerKlinikPerPeriode(granularitas: 'mingguan' | 'bulanan') {
  const standarHari = await getStandarHariVaksin(); // <-- tambah, sekali saja
  const dataset = await getDatasetKlinik();
  const peta = new Map<string, any>();
  const tahunBerjalan = new Date().getUTCFullYear(); // <-- BARU: untuk filter baris lintas-tahun

  for (const d of dataset) {
    const hasilKepatuhan = hitungKepatuhanVaksin(d.icv, standarHari); 
    for (const row of hasilKepatuhan) {
      const tgl = parseTanggalSheet(row['Tanggal Terbit']);
      if (!tgl) continue;

      let urutan: number;
      if (granularitas === 'mingguan') {
        const periodeHasil = periodeMingguanDariTanggal(tgl);
        if (periodeHasil.tahun !== tahunBerjalan) continue; // buang minggu yang "milik" tahun lain
        urutan = periodeHasil.minggu;
      } else {
        const periodeHasil = periodeBulananDariTanggal(tgl);
        if (periodeHasil.tahun !== tahunBerjalan) continue;
        urutan = periodeHasil.bulan;
      }

      const key = `${urutan}__${d.klinik.nama_klinik}`;
      const existing = peta.get(key) ?? {
        [granularitas === 'mingguan' ? 'minggu' : 'bulan']: urutan,
        wilayah_kerja: d.klinik.nama_klinik,
        kategori: d.klinik.kategori, // dari perubahan sebelumnya
        total_layanan: 0, laki_laki: 0, perempuan: 0,
        meningitis: 0, flu: 0, polio: 0, yellow_fever: 0,
        jumlah_icv: 0, patuh: 0, tidak_patuh: 0,
        wus_ya: 0, hasil_wus_positif: 0, hasil_wus_negatif: 0,
        ...komorbidKosong(), // <-- tambahan: hipertensi:0, diabetes:0, dst
      };

      existing.total_layanan += 1;
      if (row['Jenis Kelamin'] === 'Laki-laki') existing.laki_laki += 1;
      else if (row['Jenis Kelamin'] === 'Perempuan') existing.perempuan += 1;

      for (const v of [row['Jenis Vaksin 1'], row['Jenis Vaksin 2'], row['Jenis Vaksin 3']].filter(Boolean)) {
        const jenis = deteksiJenis(v);
        if (jenis) { existing[jenis] += 1; existing.jumlah_icv += 1; }
      }

      for (const nilaiKomorbid of [row['Komorbid 1'], row['Komorbid 2']]) {
        const key = deteksiKomorbid(nilaiKomorbid);
        if (key) existing[key] += 1;
      }

      if (row['WUS'] === 'Ya') existing.wus_ya += 1;
      if (row['Hasil WUS'] === 'Positif') existing.hasil_wus_positif += 1;
      else if (row['Hasil WUS'] === 'Negatif') existing.hasil_wus_negatif += 1;

      if (row.status === 'patuh') existing.patuh += 1;
      else if (row.status === 'tidak_patuh') existing.tidak_patuh += 1;

      peta.set(key, existing);
    }
  }

  return Array.from(peta.values());
}

export const getRingkasanKlinikMingguan = () => ringkasanPerKlinikPerPeriode('mingguan');
export const getRingkasanKlinikBulanan = () => ringkasanPerKlinikPerPeriode('bulanan');