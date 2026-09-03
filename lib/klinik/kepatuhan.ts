// lib/klinik/kepatuhan.ts
import { parseTanggalSheet } from './tanggal';

export type BarisIcv = Record<string, any>;
export type StatusKepatuhan = 'patuh' | 'tidak_patuh' | 'data_tidak_valid';
export type BarisIcvDenganKepatuhan = BarisIcv & { selisihHari: number; status: StatusKepatuhan };

export function hitungKepatuhanVaksin(icvRows: BarisIcv[], standarHari: number): BarisIcvDenganKepatuhan[] {
  return icvRows.map((row): BarisIcvDenganKepatuhan => {
    const tglTerbit = parseTanggalSheet(row['Tanggal Terbit']);
    const tglBerangkat = parseTanggalSheet(row['Tanggal Berangkat']);

    let status: StatusKepatuhan;
    let selisihHari = NaN;
    if (!tglTerbit || !tglBerangkat) {
      status = 'data_tidak_valid';
    } else {
      selisihHari = Math.round((tglBerangkat.getTime() - tglTerbit.getTime()) / 86400000);
      status = selisihHari < 0 ? 'data_tidak_valid' : (selisihHari >= standarHari ? 'patuh' : 'tidak_patuh');
    }
    return { ...row, selisihHari, status } as BarisIcvDenganKepatuhan;
  });
}

export function ringkasanKepatuhan(hasil: BarisIcvDenganKepatuhan[]) {
  const validRows = hasil.filter((h) => h.status !== 'data_tidak_valid');
  const patuh = validRows.filter((h) => h.status === 'patuh').length;
  return {
    total: hasil.length, patuh,
    tidak_patuh: validRows.length - patuh,
    data_tidak_valid: hasil.length - validRows.length,
    persentase_kepatuhan: validRows.length > 0 ? Math.round((patuh / validRows.length) * 100) : 0,
  };
}