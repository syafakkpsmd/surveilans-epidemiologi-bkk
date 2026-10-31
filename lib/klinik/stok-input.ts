// lib/klinik/stok-input.ts
// Aturan input stok ICV/e-ICV dan vaksin. MURNI (tanpa database), aman dipakai di browser maupun server.
// Stok adalah BUKU BESAR per (klinik, jenis): tiap hari satu baris berisi Stok Masuk, Terbit, Rusak; Sisa dihitung
// berjalan: sisa = sisa kemarin + masuk - terbit - rusak (sama seperti rumus di Sheets lama). Stok awal klinik diisi
// sebagai "Stok Masuk" pada tanggal mulai pemakaian aplikasi.
import { parseTanggal, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';

export type KelompokStok = 'buku' | 'vaksin';
export interface JenisStokInput { kunci: string; label: string; kelompok: KelompokStok; satuan: string }

/** Kunci sama dengan stok_vaksin.jenis_stok yang dibaca dashboard (lib/klinik/agregasiStok.ts). */
export const JENIS_STOK_INPUT: JenisStokInput[] = [
  { kunci: 'e-icv', label: 'e-ICV', kelompok: 'buku', satuan: 'Buku' },
  { kunci: 'icv', label: 'ICV', kelompok: 'buku', satuan: 'Buku' },
  { kunci: 'mm', label: 'Meningitis (MM)', kelompok: 'vaksin', satuan: 'Vial' },
  { kunci: 'yf', label: 'Yellow Fever', kelompok: 'vaksin', satuan: 'Vial' },
  { kunci: 'polio', label: 'Polio', kelompok: 'vaksin', satuan: 'Vial' },
  { kunci: 'flu', label: 'Influenza', kelompok: 'vaksin', satuan: 'Vial' },
];
export const kunciJenisValid = (k: string) => JENIS_STOK_INPUT.some((j) => j.kunci === k);

const SINONIM_JENIS: [RegExp, string][] = [
  [/^e[\s-]?icv\b/, 'e-icv'], [/^icv\b/, 'icv'], [/^(mm|meningitis)\b/, 'mm'], [/^(yf|yellow\s*fever)\b/, 'yf'],
  [/^polio\b/, 'polio'], [/^(flu|influenza)\b/, 'flu'],
];
/** "Meningitis (MM)", "e-ICV", "Yellow Fever", "yf" -> kunci jenis; tidak dikenal -> null. */
export function jenisDariTeks(v: unknown): string | null {
  const t = String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  for (const [re, kunci] of SINONIM_JENIS) if (re.test(t)) return kunci;
  return null;
}

export interface EntriStok { jenis: string; tanggal: string; masuk: number; terbit: number; rusak: number; keterangan: string }
export interface MentahStok { jenis?: unknown; tanggal?: unknown; masuk?: unknown; terbit?: unknown; rusak?: unknown; keterangan?: unknown }
export interface HasilValidasiStok { nilai: EntriStok | null; galat: string[]; peringatan: string[] }

const MAKS_ANGKA = 1_000_000;

function angka(v: unknown, label: string, galat: string[]): number {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return 0;
  const n = typeof v === 'number' ? v : /^\s*\d+\s*$/.test(String(v)) ? Number(String(v).trim()) : NaN;
  if (!Number.isInteger(n) || n < 0) { galat.push(`${label}: harus bilangan bulat 0 atau lebih`); return 0; }
  if (n > MAKS_ANGKA) { galat.push(`${label}: terlalu besar`); return 0; }
  return n;
}

export function validasiStok(m: MentahStok, opsi: { hariIni?: Date; urutan?: UrutanTanggal | null; jenisBawaan?: string } = {}): HasilValidasiStok {
  const galat: string[] = [];
  const peringatan: string[] = [];
  const hariIni = opsi.hariIni ?? new Date();

  const jenis = jenisDariTeks(m.jenis) ?? (m.jenis ? null : opsi.jenisBawaan ?? null);
  if (!jenis) galat.push(m.jenis ? `Jenis stok "${String(m.jenis)}" tidak dikenal` : 'Jenis stok wajib dipilih');

  const t = parseTanggal(m.tanggal, { hariIni, urutanAmbigu: opsi.urutan ?? 'dmy' });
  let tanggal = '';
  if (!t.iso) galat.push(`Tanggal: ${t.pesan ?? 'tidak valid'}`);
  else if (t.masaDepan) galat.push('Tanggal: tidak boleh lebih dari besok');
  else { tanggal = t.iso; if (t.ambigu && !opsi.urutan) peringatan.push(`Tanggal ${tanggal}: ${t.pesan}`); }

  const masuk = angka(m.masuk, 'Stok Masuk', galat);
  const terbit = angka(m.terbit, 'Terbit', galat);
  const rusak = angka(m.rusak, 'Rusak', galat);
  const keterangan = String(m.keterangan ?? '').trim();
  if (keterangan.length > 500) galat.push('Keterangan: maksimal 500 karakter');

  if (galat.length || !jenis) return { nilai: null, galat, peringatan };
  return { nilai: { jenis, tanggal, masuk, terbit, rusak, keterangan }, galat: [], peringatan };
}

export interface BarisBuku { tanggal: string; masuk: number; terbit: number; rusak: number; keterangan: string }

/** Sisa berjalan untuk baris yang SUDAH terurut menurut tanggal. negatif = indeks baris pertama yang membuat sisa < 0. */
export function hitungSisa(baris: BarisBuku[]): { sisa: number[]; negatif: { indeks: number; tanggal: string; sisa: number } | null } {
  const sisa: number[] = [];
  let berjalan = 0;
  let negatif: { indeks: number; tanggal: string; sisa: number } | null = null;
  baris.forEach((b, i) => {
    berjalan = berjalan + b.masuk - b.terbit - b.rusak;
    sisa.push(berjalan);
    if (berjalan < 0 && !negatif) negatif = { indeks: i, tanggal: b.tanggal, sisa: berjalan };
  });
  return { sisa, negatif };
}

/** Terapkan entri ke buku (satu baris per tanggal): tambah, atau ganti baris di tanggal itu. Hasil terurut menurut tanggal. */
export function terapkanEntri(buku: BarisBuku[], e: EntriStok, ganti: boolean): { buku: BarisBuku[]; sudahAda: boolean } {
  const ada = buku.some((b) => b.tanggal === e.tanggal);
  if (ada && !ganti) return { buku, sudahAda: true };
  const baru: BarisBuku = { tanggal: e.tanggal, masuk: e.masuk, terbit: e.terbit, rusak: e.rusak, keterangan: e.keterangan };
  const hasil = [...buku.filter((b) => b.tanggal !== e.tanggal), baru].sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0));
  return { buku: hasil, sudahAda: ada };
}

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Bentuk raw_json yang dibaca dashboard stok (kunci sama dengan Sheets: Tanggal, Stok Masuk, Terbit, Rusak, Sisa...). */
export function rawJsonStok(b: BarisBuku, sisa: number): Record<string, string | number> {
  return {
    'Tanggal': dmy(b.tanggal), 'Stok Masuk': b.masuk, 'Terbit': b.terbit, 'Rusak': b.rusak, 'Sisa Stok (Pelayanan)': sisa, 'Keterangan': b.keterangan,
  };
}
