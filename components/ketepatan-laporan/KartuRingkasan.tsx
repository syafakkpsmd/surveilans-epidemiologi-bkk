'use client';

/**
 * components/ketepatan-laporan/KartuRingkasan.tsx
 * Kartu ringkasan eksekutif: Kelengkapan %, Ketepatan %, total faskes, badge.
 */

import { CalendarCheck2, CalendarDays, Building2 } from 'lucide-react';
import {
  STANDAR,
  klasifikasiGabungan,
  klasifikasiKelengkapan,
  klasifikasiKetepatan,
} from '@/lib/ketepatan-laporan/evaluasi';
import type { RingkasanAgregat, Tingkat } from '@/lib/ketepatan-laporan/types';
import { GAYA_ANGKA, GAYA_BADGE, GAYA_BAR, LABEL_BADGE, formatPersen } from './gaya';

function Meter({
  label,
  nilai,
  tingkat,
  standar,
  posisiStandar,
}: {
  label: string;
  nilai: number | null;
  tingkat: Tingkat;
  standar: string;
  posisiStandar: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">{standar}</span>
      </div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${GAYA_ANGKA[tingkat]}`}>
        {nilai === null ? '—' : `${formatPersen(nilai)}%`}
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${GAYA_BAR[tingkat]}`}
          style={{ width: `${nilai ?? 0}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-0.5 h-3 w-0.5 rounded bg-slate-500/70 dark:bg-slate-300/70"
          style={{ left: `${posisiStandar}%` }}
        />
      </div>
    </div>
  );
}

export default function KartuRingkasan({
  judul,
  ringkasan,
  periodeJatuhTempo,
  periodeTotal,
  satuan,
  aktif,
  onPilih,
}: {
  judul: string;
  ringkasan: RingkasanAgregat;
  periodeJatuhTempo: number;
  periodeTotal: number;
  satuan: 'minggu' | 'bulan';
  aktif: boolean;
  onPilih: () => void;
}) {
  const badge = klasifikasiGabungan(ringkasan.kelengkapan, ringkasan.ketepatan);
  const Ikon = satuan === 'minggu' ? CalendarDays : CalendarCheck2;

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900 ${
        aktif
          ? 'border-teal-600 ring-2 ring-teal-600/20 dark:border-teal-400 dark:ring-teal-400/20'
          : 'border-slate-200 dark:border-slate-700/70'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            <Ikon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{judul}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${GAYA_BADGE[badge]}`}
        >
          {LABEL_BADGE[badge]}
        </span>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <Meter
          label="Kelengkapan"
          nilai={ringkasan.kelengkapan}
          tingkat={klasifikasiKelengkapan(ringkasan.kelengkapan)}
          standar={`Standar ≥ ${STANDAR.kelengkapan.hijau}%`}
          posisiStandar={STANDAR.kelengkapan.hijau}
        />
        <Meter
          label="Ketepatan"
          nilai={ringkasan.ketepatan}
          tingkat={klasifikasiKetepatan(ringkasan.ketepatan)}
          standar={`Standar ≥ ${STANDAR.ketepatan.hijau}%`}
          posisiStandar={STANDAR.ketepatan.hijau}
        />
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <strong className="font-semibold text-slate-700 dark:text-slate-200">{ringkasan.totalUnit}</strong> faskes
          pelapor
          <span className="text-slate-400 dark:text-slate-500">({ringkasan.unitPernahLapor} sudah pernah melapor)</span>
        </span>
        <span>
          {periodeJatuhTempo} dari {periodeTotal} {satuan} sudah jatuh tempo
        </span>
      </footer>

      {!aktif && (
        <button
          type="button"
          onClick={onPilih}
          className="mt-3 text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
        >
          Tampilkan matriks →
        </button>
      )}
    </article>
  );
}
