export const DAFTAR_WILAYAH_KARHUTLA = [
  { label: 'Palaran (Samarinda)', kode_wilker: 'WK01', zona: 'Palaran' },
  { label: 'Sidomulyo (Samarinda)', kode_wilker: 'WK01', zona: 'Sidomulyo' },
  { label: 'Klinik Pelabuhan Samarinda', kode_wilker: 'WK01', zona: 'Klinik Pelabuhan Samarinda' },

  { label: 'Bandara APT Pranoto', kode_wilker: 'WK07', zona: null },
  { label: 'Klinik APT Pranoto', kode_wilker: 'WK07', zona: 'Klinik APT Pranoto' },

  { label: 'Tanjung Santan', kode_wilker: 'WK02', zona: null },

  { label: 'Tanjung Laut', kode_wilker: 'WK03', zona: null },
  { label: 'Klinik Pelabuhan Tanjung Laut', kode_wilker: 'WK03', zona: 'Klinik Pelabuhan Tanjung Laut' },

  { label: 'Lhoktuan', kode_wilker: 'WK04', zona: null },
  { label: 'Klinik Pelabuhan Lhoktuan', kode_wilker: 'WK04', zona: 'Klinik Pelabuhan Lhoktuan' },

  { label: 'Sangatta', kode_wilker: 'WK05', zona: null },
  { label: 'Klinik Pelabuhan Sangatta', kode_wilker: 'WK05', zona: 'Klinik Pelabuhan Sangatta' },

  { label: 'Sangkulirang', kode_wilker: 'WK06', zona: null },
] as const;

export const LOKASI_KUALITAS_UDARA = [
  'Samarinda', 'Tanjung Laut', 'Sangatta', 'Lhoktuan',
  'Sangkulirang', 'APT Pranoto (Keberangkatan)',
  'APT Pranoto (Kedatangan)', 'Tanjung Santan',
] as const;

export const BAKU_MUTU_UDARA = {
  pm25: { max: 25 },
  pm10: { max: 70 },
  suhu: { min: 18, max: 30 },
  hcho: { max: 0.1 },
  tvoc: { max: 3 },
  kelembapan: { min: 40, max: 60 },
} as const;

export type StatusEvaluasi = 'MS' | 'TMS' | 'BELUM_DIUJI';

interface DataUdara {
  pm25?: number | null; pm10?: number | null; suhu?: number | null;
  hcho?: number | null; tvoc?: number | null; kelembapan?: number | null;
}

export function hitungStatusEvaluasi(data: DataUdara): StatusEvaluasi {
  const nilai = [data.pm25, data.pm10, data.suhu, data.hcho, data.tvoc, data.kelembapan];
  if (nilai.every((v) => v === null || v === undefined)) return 'BELUM_DIUJI';

  const bm = BAKU_MUTU_UDARA;
  const lewatBatas =
    (data.pm25 != null && data.pm25 > bm.pm25.max) ||
    (data.pm10 != null && data.pm10 > bm.pm10.max) ||
    (data.suhu != null && (data.suhu < bm.suhu.min || data.suhu > bm.suhu.max)) ||
    (data.hcho != null && data.hcho > bm.hcho.max) ||
    (data.tvoc != null && data.tvoc > bm.tvoc.max) ||
    (data.kelembapan != null && (data.kelembapan < bm.kelembapan.min || data.kelembapan > bm.kelembapan.max));

  return lewatBatas ? 'TMS' : 'MS';
}

export const LABEL_STATUS: Record<StatusEvaluasi, string> = {
  MS: 'Memenuhi Syarat (MS)',
  TMS: 'Tidak Memenuhi Syarat (TMS)',
  BELUM_DIUJI: 'Belum Diuji',
};