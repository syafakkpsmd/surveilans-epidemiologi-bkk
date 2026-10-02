/**
 * components/ketepatan-laporan/gaya.ts
 * Peta kelas Tailwind (terang + gelap) untuk modul Ketepatan Laporan.
 * Kelas ditulis utuh (bukan dirakit) agar terbaca oleh scanner Tailwind.
 */

import { Check, Clock, Minus, X, type LucideIcon } from 'lucide-react';
import type { StatusLaporan, Tingkat } from '@/lib/ketepatan-laporan/types';

export const GAYA_BADGE: Record<Tingkat, string> = {
  HIJAU: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30',
  KUNING: 'bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30',
  MERAH: 'bg-red-100 text-red-800 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/30',
  NETRAL: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-400/20',
};

export const GAYA_ANGKA: Record<Tingkat, string> = {
  HIJAU: 'text-emerald-600 dark:text-emerald-400',
  KUNING: 'text-amber-600 dark:text-amber-400',
  MERAH: 'text-red-600 dark:text-red-400',
  NETRAL: 'text-slate-400 dark:text-slate-500',
};

export const GAYA_BAR: Record<Tingkat, string> = {
  HIJAU: 'bg-emerald-500',
  KUNING: 'bg-amber-400',
  MERAH: 'bg-red-500',
  NETRAL: 'bg-slate-300 dark:bg-slate-600',
};

export const LABEL_BADGE: Record<Tingkat, string> = {
  HIJAU: 'Memenuhi Standar',
  KUNING: 'Perlu Perhatian',
  MERAH: 'Di Bawah Standar',
  NETRAL: 'Belum Ada Data',
};

export const INFO_STATUS: Record<
  StatusLaporan,
  { label: string; kelasSel: string; Ikon: LucideIcon }
> = {
  ON_TIME: {
    label: 'Tepat waktu',
    kelasSel: 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400',
    Ikon: Check,
  },
  LATE: {
    label: 'Terlambat',
    kelasSel: 'bg-amber-400 text-amber-950 hover:bg-amber-500 dark:bg-amber-400 dark:hover:bg-amber-300',
    Ikon: Clock,
  },
  MISSING: {
    label: 'Belum / tidak melapor',
    kelasSel: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-400',
    Ikon: X,
  },
  UPCOMING: {
    label: 'Periode belum berjalan',
    kelasSel: 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700',
    Ikon: Minus,
  },
};

/** 93.2 -> "93,2" */
export const formatPersen = (n: number): string => n.toFixed(1).replace('.', ',');
