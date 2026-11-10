'use client';

/**
 * components/ketepatan-laporan/RekapKegiatan.tsx
 * Rekap Kelengkapan & Ketepatan PER KEGIATAN (gabungan semua wilayah kerja yang wajib melapor),
 * dengan target kegiatan (mingguan, bulanan, atau siklus per tahun).
 */

import { klasifikasiKelengkapan, klasifikasiKetepatan } from '@/lib/ketepatan-laporan/evaluasi';
import type { BarisEvaluasi, RingkasanAgregat } from '@/lib/ketepatan-laporan/types';
import { GAYA_ANGKA, formatPersen } from './gaya';

export interface InfoRekap {
  kunci: string;
  label: string;
  kelompok: string;
  /** Teks target, mis. "Setiap minggu", "Setiap bulan", "6 kali/tahun (tiap 40 hari kerja)". */
  target: string;
  agregat: RingkasanAgregat;
  /** Wilayah kerja yang wajib melapor (jumlah unit). */
  baris: BarisEvaluasi[];
}

const Angka = ({ nilai, tingkat }: { nilai: number | null; tingkat: ReturnType<typeof klasifikasiKelengkapan> }) => (
  <span className={`font-semibold tabular-nums ${GAYA_ANGKA[tingkat]}`}>{nilai === null ? '—' : `${formatPersen(nilai)}%`}</span>
);

export default function RekapKegiatan({ data }: { data: InfoRekap[] }) {
  if (data.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
        Rekap per kegiatan
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <th className="px-4 py-2">Kegiatan</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2 text-center">Wilayah</th>
              <th className="px-3 py-2 text-center">Tepat / Terlambat / Belum</th>
              <th className="px-3 py-2 text-center">Kelengkapan</th>
              <th className="px-3 py-2 text-center">Ketepatan</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              const a = d.agregat;
              const tidakTerukur = d.baris.length > 0 && d.baris.every((b) => b.unit.ketepatanTerukur === false);
              return (
                <tr key={d.kunci} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{d.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{d.kelompok}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{d.target}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{a.totalUnit}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">
                    {a.onTime} / {a.late} / {a.missing}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Angka nilai={a.kelengkapan} tingkat={klasifikasiKelengkapan(a.kelengkapan)} />
                  </td>
                  <td className="px-3 py-2 text-center" title={tidakTerukur ? 'Tabel sumber tidak mencatat waktu input; ketepatan tidak dinilai' : undefined}>
                    <Angka nilai={a.ketepatan} tingkat={klasifikasiKetepatan(a.ketepatan)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
