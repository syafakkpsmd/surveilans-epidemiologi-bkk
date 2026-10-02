'use client';

/**
 * components/ketepatan-laporan/MatriksKepatuhan.tsx
 *
 * Matriks kepatuhan tahunan: kolom nama faskes (sticky kiri), kolom periode
 * (scroll horizontal), kolom ringkasan Kelengkapan & Ketepatan (sticky kanan).
 * Tooltip dirender sebagai elemen `fixed` supaya tidak terpotong oleh
 * container scroll, dan bisa dipicu hover, fokus, maupun ketuk (layar sentuh).
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { klasifikasiKelengkapan, klasifikasiKetepatan } from '@/lib/ketepatan-laporan/evaluasi';
import type { BarisEvaluasi, JenisLaporan, PeriodeJadwal, SelEvaluasi, StatusLaporan } from '@/lib/ketepatan-laporan/types';
import { formatDurasi, formatWaktuWita } from '@/lib/ketepatan-laporan/waktu';
import { GAYA_ANGKA, INFO_STATUS, formatPersen } from './gaya';

// ------------------------------------------------------------- Tooltip

interface InfoTooltip {
  judul: string;
  periode: string;
  status: StatusLaporan;
  baris: string[];
  kiri: number;
  atas: number;
  dibawah: boolean;
}

function susunIsiTooltip(sel: SelEvaluasi): { status: StatusLaporan; baris: string[] } {
  const deadline = `Deadline: ${formatWaktuWita(sel.deadline)}`;
  const selisih = sel.selisihMs;
  switch (sel.status) {
    case 'ON_TIME':
      return {
        status: sel.status,
        baris: [
          `Dikirim: ${formatWaktuWita(sel.submittedAt as Date)}`,
          deadline,
          `Tepat waktu${selisih !== null ? ` (${formatDurasi(selisih)} sebelum deadline)` : ''}`,
        ],
      };
    case 'LATE':
      return {
        status: sel.status,
        baris: [
          `Dikirim: ${formatWaktuWita(sel.submittedAt as Date)}`,
          deadline,
          `Terlambat ${selisih !== null ? formatDurasi(selisih) : ''}`.trim(),
        ],
      };
    case 'MISSING':
      return {
        status: sel.status,
        baris: [
          'Belum / tidak melapor',
          deadline,
          `Deadline terlewat ${selisih !== null ? formatDurasi(selisih) : ''}`.trim(),
        ],
      };
    default:
      return { status: sel.status, baris: ['Belum jatuh tempo', deadline] };
  }
}

const GAYA_TITIK: Record<StatusLaporan, string> = {
  ON_TIME: 'bg-emerald-500',
  LATE: 'bg-amber-400',
  MISSING: 'bg-red-500',
  UPCOMING: 'bg-slate-400',
};

// ------------------------------------------------------------- Sel

const SelPeriode = memo(function SelPeriode({
  sel,
  namaUnit,
  lebar,
  onTampil,
  onSembunyi,
}: {
  sel: SelEvaluasi;
  namaUnit: string;
  lebar: string;
  onTampil: (el: HTMLElement, sel: SelEvaluasi, namaUnit: string) => void;
  onSembunyi: () => void;
}) {
  const { kelasSel, Ikon, label } = INFO_STATUS[sel.status];
  const isi = susunIsiTooltip(sel);
  return (
    <td className="p-0.5 text-center">
      <button
        type="button"
        tabIndex={-1}
        data-sel
        aria-label={`${namaUnit}, ${sel.labelPanjang}: ${label}. ${isi.baris.join(' | ')}`}
        onMouseEnter={(e) => onTampil(e.currentTarget, sel, namaUnit)}
        onMouseLeave={onSembunyi}
        onFocus={(e) => onTampil(e.currentTarget, sel, namaUnit)}
        onBlur={onSembunyi}
        onClick={(e) => onTampil(e.currentTarget, sel, namaUnit)}
        className={`mx-auto flex h-8 items-center justify-center rounded-md transition-colors ${lebar} ${kelasSel}`}
      >
        <Ikon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </td>
  );
});

// ------------------------------------------------------------- Matriks

export default function MatriksKepatuhan({
  baris,
  jadwal,
  jenis,
  periodeBerjalan,
}: {
  baris: BarisEvaluasi[];
  jadwal: PeriodeJadwal[];
  jenis: JenisLaporan;
  periodeBerjalan: number | null;
}) {
  const [tip, setTip] = useState<InfoTooltip | null>(null);
  const lebarSel = jenis === 'MINGGUAN' ? 'w-8' : 'w-14';
  const wadah = useRef<HTMLDivElement>(null);

  const sembunyi = useCallback(() => setTip(null), []);

  const tampil = useCallback((el: HTMLElement, sel: SelEvaluasi, namaUnit: string) => {
    const r = el.getBoundingClientRect();
    const isi = susunIsiTooltip(sel);
    const tengah = r.left + r.width / 2;
    const dibawah = r.top < 120; // tidak cukup ruang di atas
    setTip({
      judul: namaUnit,
      periode: sel.labelPanjang,
      status: isi.status,
      baris: isi.baris,
      kiri: Math.min(Math.max(tengah, 150), window.innerWidth - 150),
      atas: dibawah ? r.bottom + 8 : r.top - 8,
      dibawah,
    });
  }, []);

  // Sembunyikan saat scroll, tekan Esc, atau ketuk di luar sel.
  useEffect(() => {
    if (!tip) return;
    const tutup = () => setTip(null);
    const saatEsc = (e: KeyboardEvent) => e.key === 'Escape' && setTip(null);
    const saatKetuk = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest('[data-sel]')) setTip(null);
    };
    window.addEventListener('scroll', tutup, true);
    window.addEventListener('resize', tutup);
    window.addEventListener('keydown', saatEsc);
    document.addEventListener('pointerdown', saatKetuk);
    return () => {
      window.removeEventListener('scroll', tutup, true);
      window.removeEventListener('resize', tutup);
      window.removeEventListener('keydown', saatEsc);
      document.removeEventListener('pointerdown', saatKetuk);
    };
  }, [tip]);

  // Saat dibuka, geser otomatis agar periode berjalan terlihat di layar.
  useEffect(() => {
    const el = wadah.current;
    if (!el || periodeBerjalan === null || jenis !== 'MINGGUAN') return;
    const kolom = el.querySelector<HTMLElement>(`[data-periode="${periodeBerjalan}"]`);
    if (kolom) el.scrollLeft = Math.max(0, kolom.offsetLeft - el.clientWidth / 2);
  }, [periodeBerjalan, jenis, baris.length]);

  if (baris.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Tidak ada faskes yang cocok dengan filter yang dipilih.
      </div>
    );
  }

  const selTetap = (genap: boolean) =>
    genap
      ? 'bg-white group-hover:bg-teal-50 dark:bg-slate-900 dark:group-hover:bg-slate-800'
      : 'bg-slate-50 group-hover:bg-teal-50 dark:bg-slate-900 dark:group-hover:bg-slate-800';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900">
      <div ref={wadah} className="overflow-x-auto" onScroll={sembunyi}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-30 w-32 min-w-32 max-w-32 border-b border-r border-slate-200 bg-slate-100 px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:w-52 sm:min-w-52 sm:max-w-none sm:px-4 sm:text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Faskes / Unit Pelapor
              </th>
              {jadwal.map((p) => {
                const berjalan = p.periode === periodeBerjalan;
                return (
                  <th
                    key={p.periode}
                    scope="col"
                    data-periode={p.periode}
                    title={`${p.labelPanjang} · deadline ${formatWaktuWita(p.deadline)}`}
                    className={`border-b border-slate-200 bg-slate-100 px-0.5 py-3 text-center text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800 ${
                      berjalan
                        ? 'text-teal-700 underline decoration-2 underline-offset-4 dark:text-teal-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {p.labelPendek}
                  </th>
                );
              })}
              <th
                scope="col"
                className="sm:sticky sm:right-24 sm:z-30 w-20 min-w-20 sm:w-24 sm:min-w-24 border-b border-l border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Kelengkapan
              </th>
              <th
                scope="col"
                className="sm:sticky sm:right-0 sm:z-30 w-20 min-w-20 sm:w-24 sm:min-w-24 border-b border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Ketepatan
              </th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => {
              const genap = i % 2 === 0;
              const r = b.ringkasan;
              const rincian =
                r.diEvaluasi === 0
                  ? 'Belum ada periode yang jatuh tempo'
                  : `${r.onTime + r.late} dari ${r.diEvaluasi} periode jatuh tempo masuk · tepat waktu ${r.onTime}, terlambat ${r.late}, belum ${r.missing}`;
              const tKel = klasifikasiKelengkapan(r.kelengkapan);
              const tKet = klasifikasiKetepatan(r.ketepatan);
              return (
                <tr key={b.unit.id} className="group">
                  <th
                    scope="row"
                    className={`sticky left-0 z-20 w-32 min-w-32 max-w-32 border-b border-r border-slate-100 px-2 py-2 text-left sm:w-52 sm:min-w-52 sm:max-w-none sm:px-4 font-medium text-slate-800 dark:border-slate-800 dark:text-slate-100 ${selTetap(genap)}`}
                  >
                    <div className="truncate">{b.unit.nama}</div>
                    <div className="truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {b.unit.jenis} · {b.unit.wilayah}
                    </div>
                  </th>
                  {b.sel.map((s) => (
                    <SelPeriode
                      key={s.periode}
                      sel={s}
                      namaUnit={b.unit.nama}
                      lebar={lebarSel}
                      onTampil={tampil}
                      onSembunyi={sembunyi}
                    />
                  ))}
                  <td
                    title={rincian}
                    className={`sm:sticky sm:right-24 sm:z-20 border-b border-l border-slate-100 px-2 py-2 text-center font-semibold tabular-nums dark:border-slate-800 ${GAYA_ANGKA[tKel]} ${selTetap(genap)}`}
                  >
                    {r.kelengkapan === null ? '—' : `${formatPersen(r.kelengkapan)}%`}
                  </td>
                  <td
                    title={rincian}
                    className={`sm:sticky sm:right-0 sm:z-20 border-b border-slate-100 px-2 py-2 text-center font-semibold tabular-nums dark:border-slate-800 ${GAYA_ANGKA[tKet]} ${selTetap(genap)}`}
                  >
                    {r.ketepatan === null ? '—' : `${formatPersen(r.ketepatan)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tip && (
        <div
          role="tooltip"
          aria-hidden="true"
          className="pointer-events-none fixed z-50 w-72 max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-100 shadow-xl ring-1 ring-white/10 dark:bg-slate-100 dark:text-slate-900"
          style={{
            left: tip.kiri,
            top: tip.atas,
            transform: `translate(-50%, ${tip.dibawah ? '0' : '-100%'})`,
          }}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span className={`h-2 w-2 shrink-0 rounded-full ${GAYA_TITIK[tip.status]}`} />
            <span>{tip.judul}</span>
          </div>
          <div className="mt-0.5 pl-4 text-slate-400 dark:text-slate-500">{tip.periode}</div>
          <ul className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5 text-slate-300 dark:border-slate-300 dark:text-slate-600">
            {tip.baris.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
