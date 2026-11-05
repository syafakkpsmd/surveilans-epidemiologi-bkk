// components/vektor/diare/umum.ts
import type { Jenis } from '@/lib/vektor/diare/config';

export type Baris = {
  id: number;
  tgl_kegiatan: string;
  kode_wilker: string;
  jenis_kegiatan: Jenis;
  lokasi: string;
  nilai: number | null;
  hasil_pengamatan: string;
  tindakan_pengendalian: string | null;
  insektisida_terpakai_ml: number | null;
  luas_area_semprot_m2: number | null;
  keterangan: string | null;
};

export const gayaInput =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';
export const gayaTombol =
  'rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2';
export const gayaTombolPutih =
  'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

export const fmtTgl = (s: string) => s.split('-').reverse().join('/');
export const fmtAngka = (v: number | null | undefined) =>
  v == null ? '' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 });
export const keInput = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));
export const hariIniLokal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD, zona waktu perangkat