'use client';

/**
 * components/ketepatan-laporan/KetepatanLaporanClient.tsx
 * Dashboard Ketepatan dan Kelengkapan Laporan Surveilans.
 *
 * Semua perhitungan dilakukan di klien dari data mentah (unit + laporan masuk)
 * sehingga filter Tahun / Wilayah / Jenis Faskes langsung memperbarui kartu
 * dan matriks tanpa memuat ulang halaman.
 */

import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { STANDAR, evaluasiMatriks, indeksLaporan, JUMLAH_PERIODE } from '@/lib/ketepatan-laporan/evaluasi';
import type { JenisFaskes, JenisLaporan, LaporanMasuk, UnitFaskes } from '@/lib/ketepatan-laporan/types';
import { formatWaktuWita } from '@/lib/ketepatan-laporan/waktu';
import KartuRingkasan from './KartuRingkasan';
import MatriksKepatuhan from './MatriksKepatuhan';
import { INFO_STATUS } from './gaya';

interface Props {
  nowIso: string;
  tahunBerjalan: number;
  units: UnitFaskes[];
  laporan: LaporanMasuk[];
}

const TAB: { kunci: JenisLaporan; label: string }[] = [
  { kunci: 'MINGGUAN', label: 'Laporan Mingguan (W1-W52)' },
  { kunci: 'BULANAN', label: 'Laporan Bulanan STP (Jan-Des)' },
];

const kelasSelect =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/30';

export default function KetepatanLaporanClient({ nowIso, tahunBerjalan, units, laporan }: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [tab, setTab] = useState<JenisLaporan>('MINGGUAN');
  const [tahun, setTahun] = useState(tahunBerjalan);
  const [wilayah, setWilayah] = useState('SEMUA');
  const [jenisFaskes, setJenisFaskes] = useState<'SEMUA' | JenisFaskes>('SEMUA');

  const indeks = useMemo(() => indeksLaporan(laporan), [laporan]);

  const daftarTahun = useMemo(() => {
    const set = new Set<number>([tahunBerjalan, ...laporan.map((l) => l.tahun)]);
    return [...set].sort((a, b) => b - a);
  }, [laporan, tahunBerjalan]);
  const daftarWilayah = useMemo(() => [...new Set(units.map((u) => u.wilayah))].sort(), [units]);
  const daftarJenis = useMemo(() => [...new Set(units.map((u) => u.jenis))], [units]);

  const unitTerfilter = useMemo(
    () =>
      units.filter(
        (u) => (wilayah === 'SEMUA' || u.wilayah === wilayah) && (jenisFaskes === 'SEMUA' || u.jenis === jenisFaskes),
      ),
    [units, wilayah, jenisFaskes],
  );

  const mingguan = useMemo(
    () => evaluasiMatriks(unitTerfilter, 'MINGGUAN', tahun, indeks, now),
    [unitTerfilter, tahun, indeks, now],
  );
  const bulanan = useMemo(
    () => evaluasiMatriks(unitTerfilter, 'BULANAN', tahun, indeks, now),
    [unitTerfilter, tahun, indeks, now],
  );
  const aktif = tab === 'MINGGUAN' ? mingguan : bulanan;

  const ringkasFilter = [
    `Tahun ${tahun}`,
    wilayah === 'SEMUA' ? 'Semua wilayah' : `Wilayah ${wilayah}`,
    jenisFaskes === 'SEMUA' ? 'Semua jenis faskes' : jenisFaskes,
  ].join(' · ');

  return (
    <div className="space-y-6 rounded-3xl bg-slate-50 p-4 text-slate-800 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
      {/* Judul */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-teal-600 p-2.5 text-white dark:bg-teal-500">
            <ClipboardList className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Ketepatan dan Kelengkapan Laporan Surveilans
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {ringkasFilter} · data per {formatWaktuWita(now)}
            </p>
          </div>
        </div>
      </header>

      {/* Kartu ringkasan eksekutif */}
      <section aria-label="Ringkasan evaluasi kinerja" className="grid gap-4 lg:grid-cols-2">
        <KartuRingkasan
          judul="Laporan Mingguan (YTD)"
          ringkasan={mingguan.agregat}
          periodeJatuhTempo={mingguan.periodeJatuhTempo}
          periodeTotal={JUMLAH_PERIODE.MINGGUAN}
          satuan="minggu"
          aktif={tab === 'MINGGUAN'}
          onPilih={() => setTab('MINGGUAN')}
        />
        <KartuRingkasan
          judul="Laporan Bulanan STP (YTD)"
          ringkasan={bulanan.agregat}
          periodeJatuhTempo={bulanan.periodeJatuhTempo}
          periodeTotal={JUMLAH_PERIODE.BULANAN}
          satuan="bulan"
          aktif={tab === 'BULANAN'}
          onPilih={() => setTab('BULANAN')}
        />
      </section>

      {/* Tab + filter */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div
            role="tablist"
            aria-label="Jenis laporan"
            className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"
          >
            {TAB.map((t) => (
              <button
                key={t.kunci}
                role="tab"
                type="button"
                aria-selected={tab === t.kunci}
                onClick={() => setTab(t.kunci)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition sm:px-4 ${
                  tab === t.kunci
                    ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Tahun
              <select className={kelasSelect} value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                {daftarTahun.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Wilayah
              <select className={kelasSelect} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
                <option value="SEMUA">Semua wilayah</option>
                {daftarWilayah.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Jenis faskes
              <select
                className={kelasSelect}
                value={jenisFaskes}
                onChange={(e) => setJenisFaskes(e.target.value as 'SEMUA' | JenisFaskes)}
              >
                <option value="SEMUA">Semua jenis</option>
                {daftarJenis.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Legenda */}
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
          {(Object.keys(INFO_STATUS) as (keyof typeof INFO_STATUS)[]).map((s) => {
            const { Ikon, kelasSel, label } = INFO_STATUS[s];
            return (
              <li key={s} className="inline-flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded ${kelasSel}`}>
                  <Ikon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {label}
              </li>
            );
          })}
        </ul>

        <MatriksKepatuhan
          baris={aktif.baris}
          jadwal={aktif.jadwal}
          jenis={tab}
          periodeBerjalan={tahun === tahunBerjalan ? aktif.periodeBerjalan : null}
        />

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <strong>Cara menghitung.</strong> Kelengkapan = laporan masuk (tepat waktu + terlambat) ÷ periode yang sudah
          jatuh tempo; Ketepatan = laporan tepat waktu ÷ periode yang sudah jatuh tempo. Periode yang belum jatuh tempo
          tidak dihitung. Standar: Kelengkapan ≥ {STANDAR.kelengkapan.hijau}% (hijau), {STANDAR.kelengkapan.kuning}–
          {STANDAR.kelengkapan.hijau - 1}% (kuning), &lt; {STANDAR.kelengkapan.kuning}% (merah); Ketepatan ≥{' '}
          {STANDAR.ketepatan.hijau}% (hijau). Deadline mingguan: Selasa 17:00 WITA pada minggu berikutnya; bulanan:
          tanggal 10 pukul 23:59 WITA pada bulan berikutnya.
        </p>
      </section>
    </div>
  );
}
