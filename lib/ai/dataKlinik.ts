// lib/ai/dataKlinik.ts
import { getDatasetKlinik, type BarisDatasetKlinik } from '@/lib/klinik/dataset';
import { hitungKepatuhanVaksin, ringkasanKepatuhan } from '@/lib/klinik/kepatuhan';
import { getStandarHariVaksin } from '@/lib/klinik/pengaturan';
import { parseTanggalSheet } from '@/lib/klinik/tanggal';
import {
  parsePeriodeMingguan, parsePeriodeBulanan,
  periodeMingguanSebelumnya, periodeBulananSebelumnya,
  labelPeriodeMingguan, labelPeriodeBulanan,
  isPeriodeRentangMingguan, isPeriodeRentangBulanan,
  parseRentangMingguan, parseRentangBulanan,
  labelRentangMingguan, labelRentangBulanan,
  type PeriodeMingguan, type PeriodeBulanan,
} from './periode';
import type { DataAnalisis } from './data';

function tanggalMulaiMingguEpid(tahun: number, minggu: number): Date {
  const jan1 = Date.UTC(tahun, 0, 1);
  const jan1Dow = new Date(jan1).getUTCDay();
  const minggu1Mulai = jan1Dow <= 3 ? jan1 - jan1Dow * 86400000 : jan1 + (7 - jan1Dow) * 86400000;
  return new Date(minggu1Mulai + (minggu - 1) * 7 * 86400000);
}

function rentangTanggalMingguan(tahun: number, mingguAwal: number, mingguAkhir: number) {
  const mulai = tanggalMulaiMingguEpid(tahun, mingguAwal);
  const akhir = new Date(tanggalMulaiMingguEpid(tahun, mingguAkhir).getTime() + 6 * 86400000);
  return { mulai, akhir };
}

function rentangTanggalBulanan(tahun: number, bulanAwal: number, bulanAkhir: number) {
  const mulai = new Date(Date.UTC(tahun, bulanAwal - 1, 1));
  const akhir = new Date(Date.UTC(tahun, bulanAkhir, 0));
  return { mulai, akhir };
}

function filterIcvRentang(dataset: BarisDatasetKlinik[], wilayahKerja: string | undefined, mulai: Date, akhir: Date) {
  const relevan = wilayahKerja ? dataset.filter((d) => d.klinik.nama_klinik === wilayahKerja) : dataset;
  return relevan.flatMap((d: BarisDatasetKlinik) =>
    d.icv
      .filter((row: Record<string, any>) => {
        const t = parseTanggalSheet(row['Tanggal Terbit']);
        return t ? t >= mulai && t <= akhir : false;
      })
      .map((row: Record<string, any>) => ({ ...row, nama_klinik: d.klinik.nama_klinik }))
  );
}

async function ambilKepatuhanRentang(mulai: Date, akhir: Date, wilayahKerja: string | undefined, standarHari: number) {
  const dataset = await getDatasetKlinik();
  const rows = filterIcvRentang(dataset, wilayahKerja, mulai, akhir);
  const hasil = hitungKepatuhanVaksin(rows, standarHari);
  return { ringkasan: ringkasanKepatuhan(hasil), hasil };
}

function topKlinikTidakPatuh(hasil: ReturnType<typeof hitungKepatuhanVaksin>) {
  const perKlinik = new Map<string, number>();
  for (const row of hasil) {
    if (row.status === 'tidak_patuh') {
      perKlinik.set(row.nama_klinik, (perKlinik.get(row.nama_klinik) ?? 0) + 1);
    }
  }
  return Array.from(perKlinik, ([nilai, jumlah]) => ({ nilai, kategori: 'tidak_patuh', jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

export async function ambilDataAnalisisKlinik(
  konteks: 'klinik-kepatuhan-mingguan' | 'klinik-kepatuhan-bulanan',
  periodeKey: string,
  wilayahKerja: string | undefined,
  tipe: 'analisis' | 'prediksi'
): Promise<DataAnalisis> {
  const standarHari = await getStandarHariVaksin(); // <-- diambil sekali, dipakai di semua titik di bawah
  const isMingguan = konteks === 'klinik-kepatuhan-mingguan';
  const labelWilayah = wilayahKerja ?? 'Semua Klinik';

  if (isMingguan) {
    const r = isPeriodeRentangMingguan(periodeKey)
      ? parseRentangMingguan(periodeKey)
      : (() => {
          const p = parsePeriodeMingguan(periodeKey);
          return { tahun: p.tahun, mingguAwal: p.minggu, mingguAkhir: p.minggu };
        })();

    if (tipe === 'prediksi') {
      const periodeSaatIni: PeriodeMingguan = { jenis: 'mingguan', tahun: r.tahun, minggu: r.mingguAkhir };
      const periodeSebelumnya = periodeMingguanSebelumnya(periodeSaatIni);
      const { mulai, akhir } = rentangTanggalMingguan(periodeSaatIni.tahun, periodeSaatIni.minggu, periodeSaatIni.minggu);
      const { mulai: mulaiSeb, akhir: akhirSeb } = rentangTanggalMingguan(periodeSebelumnya.tahun, periodeSebelumnya.minggu, periodeSebelumnya.minggu);
      const [saatIni, sebelumnya] = await Promise.all([
        ambilKepatuhanRentang(mulai, akhir, wilayahKerja, standarHari),
        ambilKepatuhanRentang(mulaiSeb, akhirSeb, wilayahKerja, standarHari),
      ]);
      return {
        labelKonteks: `Kepatuhan Masa Aktif Vaksin (standar ${standarHari} hari)`,
        labelWilayah,
        labelPeriodeSaatIni: labelPeriodeMingguan(periodeSaatIni),
        labelPeriodeSebelumnya: labelPeriodeMingguan(periodeSebelumnya),
        ringkasanSaatIni: saatIni.ringkasan,
        ringkasanSebelumnya: sebelumnya.ringkasan,
        topKategori: topKlinikTidakPatuh(saatIni.hasil),
      };
    }

    const adaSebelumnya = r.mingguAwal > 1;
    const { mulai, akhir } = rentangTanggalMingguan(r.tahun, r.mingguAwal, r.mingguAkhir);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilKepatuhanRentang(mulai, akhir, wilayahKerja, standarHari),
      adaSebelumnya
        ? ambilKepatuhanRentang(...Object.values(rentangTanggalMingguan(r.tahun, 1, r.mingguAwal - 1)) as [Date, Date], wilayahKerja, standarHari)
        : Promise.resolve({ ringkasan: ringkasanKepatuhan([]), hasil: [] }),
    ]);
    return {
      labelKonteks: `Kepatuhan Masa Aktif Vaksin (standar ${standarHari} hari)`,
      labelWilayah,
      labelPeriodeSaatIni: labelRentangMingguan(r),
      labelPeriodeSebelumnya: adaSebelumnya
        ? `minggu epidemiologi ke-1 s.d. ke-${r.mingguAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
        : 'Tidak ada data sebelum minggu ke-1',
      ringkasanSaatIni: saatIni.ringkasan,
      ringkasanSebelumnya: sebelumnya.ringkasan,
      topKategori: topKlinikTidakPatuh(saatIni.hasil),
    };
  }

  // --- Bulanan ---
  const r = isPeriodeRentangBulanan(periodeKey)
    ? parseRentangBulanan(periodeKey)
    : (() => {
        const p = parsePeriodeBulanan(periodeKey);
        return { tahun: p.tahun, bulanAwal: p.bulan, bulanAkhir: p.bulan };
      })();

  if (tipe === 'prediksi') {
    const periodeSaatIni: PeriodeBulanan = { jenis: 'bulanan', tahun: r.tahun, bulan: r.bulanAkhir };
    const periodeSebelumnya = periodeBulananSebelumnya(periodeSaatIni);
    const { mulai, akhir } = rentangTanggalBulanan(periodeSaatIni.tahun, periodeSaatIni.bulan, periodeSaatIni.bulan);
    const { mulai: mulaiSeb, akhir: akhirSeb } = rentangTanggalBulanan(periodeSebelumnya.tahun, periodeSebelumnya.bulan, periodeSebelumnya.bulan);
    const [saatIni, sebelumnya] = await Promise.all([
      ambilKepatuhanRentang(mulai, akhir, wilayahKerja, standarHari),
      ambilKepatuhanRentang(mulaiSeb, akhirSeb, wilayahKerja, standarHari),
    ]);
    return {
      labelKonteks: `Kepatuhan Masa Aktif Vaksin (standar ${standarHari} hari)`,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeBulanan(periodeSaatIni),
      labelPeriodeSebelumnya: labelPeriodeBulanan(periodeSebelumnya),
      ringkasanSaatIni: saatIni.ringkasan,
      ringkasanSebelumnya: sebelumnya.ringkasan,
      topKategori: topKlinikTidakPatuh(saatIni.hasil),
    };
  }

  const adaSebelumnya = r.bulanAwal > 1;
  const { mulai, akhir } = rentangTanggalBulanan(r.tahun, r.bulanAwal, r.bulanAkhir);
  const [saatIni, sebelumnya] = await Promise.all([
    ambilKepatuhanRentang(mulai, akhir, wilayahKerja, standarHari),
    adaSebelumnya
      ? ambilKepatuhanRentang(...Object.values(rentangTanggalBulanan(r.tahun, 1, r.bulanAwal - 1)) as [Date, Date], wilayahKerja, standarHari)
      : Promise.resolve({ ringkasan: ringkasanKepatuhan([]), hasil: [] }),
  ]);
  return {
    labelKonteks: `Kepatuhan Masa Aktif Vaksin (standar ${standarHari} hari)`,
    labelWilayah,
    labelPeriodeSaatIni: labelRentangBulanan(r),
    labelPeriodeSebelumnya: adaSebelumnya
      ? `bulan ke-1 s.d. ke-${r.bulanAwal - 1} tahun ${r.tahun} (sebelum rentang ini)`
      : 'Tidak ada data sebelum bulan ke-1',
    ringkasanSaatIni: saatIni.ringkasan,
    ringkasanSebelumnya: sebelumnya.ringkasan,
    topKategori: topKlinikTidakPatuh(saatIni.hasil),
  };
}