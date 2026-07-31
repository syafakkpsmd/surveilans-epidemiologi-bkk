'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import FilterRentangBulan from '@/components/vektor/FilterRentangBulan';
import TrenChartMingguan, { type SeriesTren } from '@/components/vektor/TrenChartMingguan';
import GrafikBarBulanan, { type SeriesBar } from '@/components/vektor/GrafikBarBulanan';

type Mode = 'mingguan' | 'bulanan';

interface PanelTrenPeriodeProps {
  judulBulanan: string;
  judulMingguan: string;
  dataMingguan: Record<string, unknown>[];
  dataBulanan: Record<string, unknown>[];
  seriesListMingguan: SeriesTren[];
  seriesListBulanan: SeriesBar[];
  labelSumbuXBulanan?: string;
}

export default function PanelTrenPeriode({
  judulBulanan,
  judulMingguan,
  dataMingguan,
  dataBulanan,
  seriesListMingguan,
  seriesListBulanan,
  labelSumbuXBulanan = 'bulanLabel',
}: PanelTrenPeriodeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get('mode');
  const mode: Mode = modeParam === 'bulanan' ? 'bulanan' : 'mingguan';

  const handleSwitchMode = (targetMode: Mode) => {
    if (targetMode === mode) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', targetMode);

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => handleSwitchMode('mingguan')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'mingguan'
                ? 'bg-[#0F2A38] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Mingguan (Line)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('bulanan')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'bulanan'
                ? 'bg-[#0F2A38] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bulanan (Bar)
          </button>
        </div>

        {mode === 'mingguan' ? <FilterRentangMinggu /> : <FilterRentangBulan />}
      </div>

      {mode === 'mingguan' ? (
        <TrenChartMingguan judul={judulMingguan} data={dataMingguan} seriesList={seriesListMingguan} />
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