'use client';

// ================================================================
// components/vektor/PanelTrenPeriode.tsx
// Wrapper client component untuk toggle tab "Mingguan (Line)" /
// "Bulanan (Bar)" — merakit TrenChartMingguan (existing) dan
// GrafikBarBulanan (existing), plus filter rentang yang sesuai
// (FilterRentangMinggu / FilterRentangBulan, existing).
//
// Dipakai untuk 2 kasus: Anopheles Dewasa & Larva — cukup beda
// data & seriesList yang dikirim dari page.tsx (server component).
// ================================================================

import { useState } from 'react';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import FilterRentangBulan from '@/components/vektor/FilterRentangBulan';
import TrenChartMingguan, { type SeriesTren } from '@/components/vektor/TrenChartMingguan';
import GrafikBarBulanan, { type SeriesBar } from '@/components/vektor/GrafikBarBulanan';

type Mode = 'mingguan' | 'bulanan';

interface PanelTrenPeriodeProps {
  judulBulanan: string;
  dataMingguan: Record<string, unknown>[];
  dataBulanan: Record<string, unknown>[];
  seriesListMingguan: SeriesTren[];
  seriesListBulanan: SeriesBar[];
  labelSumbuXBulanan?: string;
}

export default function PanelTrenPeriode({
  judulBulanan,
  dataMingguan,
  dataBulanan,
  seriesListMingguan,
  seriesListBulanan,
  labelSumbuXBulanan = 'bulanLabel',
}: PanelTrenPeriodeProps) {
  const [mode, setMode] = useState<Mode>('mingguan');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => setMode('mingguan')}
            className={`px-3 py-1.5 ${
              mode === 'mingguan' ? 'bg-[#0F2A38] text-white' : 'bg-white text-gray-600'
            }`}
          >
            Mingguan (Line)
          </button>
          <button
            onClick={() => setMode('bulanan')}
            className={`px-3 py-1.5 ${
              mode === 'bulanan' ? 'bg-[#0F2A38] text-white' : 'bg-white text-gray-600'
            }`}
          >
            Bulanan (Bar)
          </button>
        </div>

        {mode === 'mingguan' ? <FilterRentangMinggu /> : <FilterRentangBulan />}
      </div>

      {mode === 'mingguan' ? (
        <TrenChartMingguan data={dataMingguan} seriesList={seriesListMingguan} />
      ) : (
        <GrafikBarBulanan
          judul={judulBulanan}
          data={dataBulanan}
          seriesList={seriesListBulanan}
          labelSumbuX={labelSumbuXBulanan}
        />
      )}
    </div>
  );
}