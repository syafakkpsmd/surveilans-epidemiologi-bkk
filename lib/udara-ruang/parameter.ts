// lib/udara-ruang/parameter.ts  (FILE BARU)
// SUMBER TUNGGAL parameter pemeriksaan udara dalam ruang dan baku mutunya (dari Form_Pemeriksaan_Udara_Dalam_Ruang.xlsx).
// Murni. Form, templat Excel, validasi rentang, penilaian MS/TMS, dan dasbor semuanya membaca daftar ini.
import { KOLOM_LAMA } from './skema';

export type KunciParam =
  | 'suhu' | 'pencahayaan' | 'kelembapan' | 'pm10' | 'pm25' | 'kebisingan'
  | 'hcho' | 'tvoc' | 'so2' | 'no2' | 'o3' | 'hg' | 'mikroorganisme';

export type KelompokParam = 'fisik' | 'kimia' | 'biologi';

export interface Parameter {
  kunci: KunciParam;
  nama: string;
  satuan: string;
  kelompok: KelompokParam;
  /** Batas bawah/atas baku mutu. Tanpa keduanya = tidak dinilai otomatis. */
  min?: number;
  max?: number;
  /** Teks acuan persis seperti di formulir. */
  acuan: string;
  /** false = tidak dinilai MS/TMS otomatis (tanpa baku mutu, atau acuan bergantung lama rata-rata): dinilai petugas. */
  dinilai: boolean;
  /** Rentang yang masuk akal untuk satuan di kolom ini. Di luar rentang = kemungkinan salah satuan/salah ketik: ditolak saat input
   *  dan ditandai "perlu diperiksa" di dasbor (dikeluarkan dari rata-rata). */
  rentangWajar: [number, number];
  /** Parameter yang harus terisi agar pengukuran dianggap LENGKAP (meniru perilaku status Karhutla: kosong = "Data Belum Lengkap"). */
  wajibLengkap: boolean;
  aliasTambahan?: string[];
}

export const PARAMETER: readonly Parameter[] = [
  { kunci: 'suhu', nama: 'Suhu', satuan: '°C', kelompok: 'fisik', min: 18, max: 30, acuan: '18–30 °C', dinilai: true, rentangWajar: [0, 60], wajibLengkap: true },
  { kunci: 'pencahayaan', nama: 'Pencahayaan', satuan: 'lux', kelompok: 'fisik', min: 60, acuan: '≥ 60 lux', dinilai: true, rentangWajar: [0, 100000], wajibLengkap: false },
  { kunci: 'kelembapan', nama: 'Kelembapan relatif', satuan: '%RH', kelompok: 'fisik', min: 40, max: 60, acuan: '40–60 %RH', dinilai: true, rentangWajar: [0, 100], wajibLengkap: true, aliasTambahan: ['Kelembapan', 'Lembap', 'RH'] },
  { kunci: 'pm10', nama: 'PM10', satuan: 'µg/m³', kelompok: 'fisik', max: 70, acuan: '≤ 70 µg/m³', dinilai: true, rentangWajar: [0, 2000], wajibLengkap: true },
  { kunci: 'pm25', nama: 'PM2.5', satuan: 'µg/m³', kelompok: 'fisik', max: 25, acuan: '≤ 25 µg/m³', dinilai: true, rentangWajar: [0, 2000], wajibLengkap: true, aliasTambahan: ['PM 2.5', 'PM2,5'] },
  { kunci: 'kebisingan', nama: 'Kebisingan (pelabuhan laut)', satuan: 'dB(A)', kelompok: 'fisik', max: 70, acuan: '≤ 70 dB(A)', dinilai: true, rentangWajar: [20, 150], wajibLengkap: false, aliasTambahan: ['Kebisingan'] },
  { kunci: 'hcho', nama: 'Formaldehida (HCHO)', satuan: 'ppm', kelompok: 'kimia', max: 0.1, acuan: '0,1 ppm', dinilai: true, rentangWajar: [0, 10], wajibLengkap: true, aliasTambahan: ['HCHO', 'Formaldehida'] },
  { kunci: 'tvoc', nama: 'Total senyawa organik mudah menguap (TVOC)', satuan: 'mg/m³', kelompok: 'kimia', acuan: 'belum ada acuan di formulir', dinilai: false, rentangWajar: [0, 100], wajibLengkap: true, aliasTambahan: ['TVOC'] },
  { kunci: 'so2', nama: 'Sulfur dioksida (SO₂)', satuan: 'µg/m³', kelompok: 'kimia', acuan: '500 (rata-rata 10 menit); 20 (24 jam)', dinilai: false, rentangWajar: [0, 5000], wajibLengkap: false, aliasTambahan: ['SO2'] },
  { kunci: 'no2', nama: 'Nitrogen dioksida (NO₂)', satuan: 'µg/m³', kelompok: 'kimia', acuan: '200 (rata-rata 1 jam); 40 (rata-rata 1 tahun)', dinilai: false, rentangWajar: [0, 5000], wajibLengkap: false, aliasTambahan: ['NO2'] },
  { kunci: 'o3', nama: 'Ozon (O₃)', satuan: 'µg/m³', kelompok: 'kimia', acuan: '100 (rata-rata 8 jam)', dinilai: false, rentangWajar: [0, 1000], wajibLengkap: false, aliasTambahan: ['O3', 'Ozon'] },
  { kunci: 'hg', nama: 'Merkuri (Hg)', satuan: 'µg/m³', kelompok: 'kimia', max: 1, acuan: '≤ 1 µg/m³', dinilai: true, rentangWajar: [0, 100], wajibLengkap: false, aliasTambahan: ['Merkuri', 'Hg'] },
  { kunci: 'mikroorganisme', nama: 'Angka mikroorganisme udara', satuan: 'CFU/m³', kelompok: 'biologi', max: 700, acuan: '≤ 700 CFU/m³', dinilai: true, rentangWajar: [0, 1000000], wajibLengkap: false, aliasTambahan: ['Mikroorganisme', 'Angka kuman'] },
] as const;

export const NAMA_KELOMPOK: Record<KelompokParam, string> = {
  fisik: 'Parameter fisik dan partikulat',
  kimia: 'Parameter kimia',
  biologi: 'Parameter biologi',
};

/** Nama kolom di database: parameter lama ikut nama kolom Karhutla, parameter baru memakai kuncinya sendiri. */
export function kolomDb(k: KunciParam): string {
  return (KOLOM_LAMA as Record<string, string>)[k] ?? k;
}

export const adaBakuMutu = (p: Parameter) => p.dinilai && (p.min !== undefined || p.max !== undefined);

export function teksBakuMutu(p: Parameter): string {
  if (p.min !== undefined && p.max !== undefined) return `${p.min}–${p.max} ${p.satuan}`;
  if (p.max !== undefined) return `≤ ${p.max} ${p.satuan}`;
  if (p.min !== undefined) return `≥ ${p.min} ${p.satuan}`;
  return p.acuan;
}
