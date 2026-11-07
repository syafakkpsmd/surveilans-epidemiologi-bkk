// lib/media-tanah/config.ts
// Isi formulir "Pemeriksaan Kesehatan Lingkungan Media Tanah". Aman diimpor client maupun server.
//
// Daftar wilayah kerja TIDAK ditulis di sini: sumbernya tabel `wilker_ref` di database.
//   * Server : const wk = await getKamusWilker();            // '@/lib/wilayah-kerja/server'
//   * Client : const wk = useMemo(() => buatKamus(wilayah), [wilayah]);  // `wilayah` dari props server
// lalu teruskan `wk` ke fungsi bantu di bawah.
import type { KamusWilker } from '@/lib/wilayah-kerja';

/** Opsi dropdown wilayah untuk input baru (hanya wilayah yang aktif). */
export function opsiWilayah(wk: KamusWilker): { kode: string; nama: string }[] {
  return wk.aktif.map((w) => ({ kode: w.kode, nama: w.nama }));
}

/** Kode wilayah yang sah untuk input baru (aktif saja). Dipakai validasi unggahan/form. */
export function kodeWilayahAktif(wk: KamusWilker): string[] {
  return wk.daftarKodeAktif;
}

/** Kode -> nama panjang, termasuk wilayah nonaktif (supaya data historis tetap terbaca). */
export function namaWilayah(wk: KamusWilker): Record<string, string> {
  return wk.namaPanjangByKode;
}

export type Item = { kode: string; label: string; singkat: string };

// B. Persyaratan kesehatan tanah (Memenuhi / Tidak memenuhi)
export const ITEM_B: Item[] = [
  { kode: 'B1', label: 'Tanah tidak bekas tempat pembuangan/pemrosesan akhir sampah', singkat: 'Bekas TPA/pemrosesan sampah' },
  { kode: 'B2', label: 'Tanah tidak bekas lokasi pertambangan yang tercemar', singkat: 'Bekas tambang tercemar' },
  { kode: 'B3', label: 'Tanah bersih dari kotoran manusia dan hewan', singkat: 'Ada kotoran manusia/hewan' },
  { kode: 'B4', label: 'Tanah bukan terletak pada daerah rawan bencana longsor', singkat: 'Daerah rawan longsor' },
  { kode: 'B5', label: 'Tanah aman dari kemungkinan kontaminasi B3 dan/atau Limbah B3', singkat: 'Rawan kontaminasi B3/Limbah B3' },
];

// C. Kondisi fisik tanah. Nilai SBMKL dikosongkan di formulir, jadi diisi petugas.
export const ITEM_C = [
  { kode: 'C1', label: 'Suhu tanah', satuan: '°C', min: -20, max: 100 },
  { kode: 'C2', label: 'Kelembaban tanah', satuan: '%', min: 0, max: 100 },
  { kode: 'C3', label: 'Derajat keasaman (pH)', satuan: '-', min: 0, max: 14 },
  { kode: 'C4', label: 'Porositas tanah', satuan: '%', min: 0, max: 100 },
];

// D. Potensi sumber pencemaran (Ada / Tidak)
export const ITEM_D: Item[] = [
  { kode: 'D1', label: 'Tumpahan minyak atau bahan bakar', singkat: 'Tumpahan minyak/BBM' },
  { kode: 'D2', label: 'Tumpahan bahan kimia atau muatan berbahaya', singkat: 'Tumpahan bahan kimia' },
  { kode: 'D3', label: 'Timbunan sampah atau limbah padat', singkat: 'Timbunan sampah/limbah padat' },
  { kode: 'D4', label: 'Genangan air atau limpasan dari area tercemar', singkat: 'Genangan/limpasan tercemar' },
  { kode: 'D5', label: 'Aktivitas bongkar muat yang berpotensi mencemari tanah', singkat: 'Bongkar muat berpotensi cemar' },
  { kode: 'D6', label: 'Riwayat pencemaran atau kegiatan yang berpotensi mencemari tanah', singkat: 'Riwayat pencemaran' },
];

// E. Laboratorium. Batas = nilai SBMKL maksimum (mg/kg) sesuai formulir.
export const SATUAN_E = 'mg/kg';
export const ITEM_E = [
  { kode: 'E1', label: 'Antimoni (Sb)', batas: 3 },
  { kode: 'E2', label: 'Arsenik (As)', batas: 20 },
  { kode: 'E3', label: 'Barium (Ba)', batas: 160 },
  { kode: 'E4', label: 'Berilium (Be)', batas: 1.1 },
  { kode: 'E5', label: 'Boron (B)', batas: 36 },
  { kode: 'E6', label: 'Kadmium (Cd)', batas: 3 },
  { kode: 'E7', label: 'Krom valensi 6 (Cr⁶⁺)', batas: 1 },
  { kode: 'E8', label: 'Tembaga (Cu)', batas: 30 },
  { kode: 'E9', label: 'Timbal (Pb)', batas: 300 },
  { kode: 'E10', label: 'Merkuri (Hg)', batas: 0.3 },
  { kode: 'E11', label: 'Molibdenum (Mo)', batas: 40 },
  { kode: 'E12', label: 'Nikel (Ni)', batas: 60 },
  { kode: 'E13', label: 'Selenium (Se)', batas: 10 },
  { kode: 'E14', label: 'Perak (Ag)', batas: 10 },
  { kode: 'E15', label: 'Seng (Zn)', batas: 120 },
  { kode: 'E16', label: 'Sianida total (CN)', batas: 50 },
  { kode: 'E17', label: 'Fluorida', batas: 450 },
];

export const teksBatas = (b: number) => `≤ ${String(b).replace('.', ',')}`;

export function statusLab(hasil: number | null, batas: number): 'memenuhi' | 'tidak_memenuhi' | null {
  if (hasil == null || Number.isNaN(hasil)) return null;
  return hasil <= batas ? 'memenuhi' : 'tidak_memenuhi';
}

export const KESIMPULAN = [
  { nilai: 'memenuhi', label: 'Memenuhi persyaratan kesehatan media tanah' },
  { nilai: 'tidak_memenuhi', label: 'Tidak memenuhi persyaratan kesehatan media tanah' },
  { nilai: 'perlu_lab', label: 'Memerlukan pemeriksaan laboratorium lebih lanjut' },
] as const;
export const LABEL_KESIMPULAN: Record<string, string> = Object.fromEntries(KESIMPULAN.map((k) => [k.nilai, k.label]));

export const LABEL_ITEM: Record<string, string> = Object.fromEntries(
  [...ITEM_B, ...ITEM_C, ...ITEM_D, ...ITEM_E].map((i) => [i.kode, i.label])
);