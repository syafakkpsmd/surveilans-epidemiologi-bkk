// lib/klinik/ringkasanPeriode.ts
import { getDatasetKlinik } from './dataset';
import { hitungKepatuhanVaksin } from './kepatuhan';
import { periodeMingguanDariTanggal, periodeBulananDariTanggal } from '@/lib/ai/periode';
import { parseTanggalSheet } from './tanggal';
import { getStandarHariVaksin } from './pengaturan';

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

  for (const d of dataset) {
    const hasilKepatuhan = hitungKepatuhanVaksin(d.icv, standarHari); 
    for (const row of hasilKepatuhan) {
      const tgl = parseTanggalSheet(row['Tanggal Terbit']);
      if (!tgl) continue;

      const urutan = granularitas === 'mingguan'
        ? periodeMingguanDariTanggal(tgl).minggu
        : periodeBulananDariTanggal(tgl).bulan;

      const key = `${urutan}__${d.klinik.nama_klinik}`;
      const existing = peta.get(key) ?? {
        [granularitas === 'mingguan' ? 'minggu' : 'bulan']: urutan,
        wilayah_kerja: d.klinik.nama_klinik, // reuse nama field yg sama spt modul lain
        total_layanan: 0, laki_laki: 0, perempuan: 0,
        meningitis: 0, flu: 0, polio: 0, yellow_fever: 0,
        jumlah_icv: 0, patuh: 0, tidak_patuh: 0,
      };

      existing.total_layanan += 1;
      if (row['Jenis Kelamin'] === 'Laki-laki') existing.laki_laki += 1;
      else if (row['Jenis Kelamin'] === 'Perempuan') existing.perempuan += 1;

      for (const v of [row['Jenis Vaksin 1'], row['Jenis Vaksin 2'], row['Jenis Vaksin 3']].filter(Boolean)) {
        const jenis = deteksiJenis(v);
        if (jenis) { existing[jenis] += 1; existing.jumlah_icv += 1; }
      }

      if (row.status === 'patuh') existing.patuh += 1;
      else if (row.status === 'tidak_patuh') existing.tidak_patuh += 1;

      peta.set(key, existing);
    }
  }

  return Array.from(peta.values());
}

export const getRingkasanKlinikMingguan = () => ringkasanPerKlinikPerPeriode('mingguan');
export const getRingkasanKlinikBulanan = () => ringkasanPerKlinikPerPeriode('bulanan');