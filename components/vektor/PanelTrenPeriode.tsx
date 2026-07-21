'use client';

// ================================================================
// components/vektor/PanelTrenPeriode.tsx
// Wrapper client component untuk toggle tab "Mingguan (Line)" /
// "Bulanan (Bar)" — sinkron dengan URL SearchParams agar seluruh
// komponen halaman beradaptasi secara dinamis.
// ================================================================

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Mode dibaca langsung dari URL param 'mode', fallback ke 'mingguan'
  const modeParam = searchParams.get('mode');
  const mode: Mode = modeParam === 'bulanan' ? 'bulanan' : 'mingguan';

  // Handler untuk mengubah mode & update query params di URL
  const handleSwitchMode = (targetMode: Mode) => {
    if (targetMode === mode) return; // Mencegah re-navigation jika mode sama

    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', targetMode);

    // Push URL baru agar Server Component membaca update params
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Toggle Switch Mode */}
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

        {/* Filter Rentang Sesuai Mode */}
        {mode === 'mingguan' ? <FilterRentangMinggu /> : <FilterRentangBulan />}
      </div>

      {/* Render Chart Sesuai Mode */}
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