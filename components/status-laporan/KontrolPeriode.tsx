'use client';

/**
 * components/status-laporan/KontrolPeriode.tsx
 * Toggle tab Mingguan/Bulanan + picker tahun+minggu (mingguan) atau
 * tahun+bulan (bulanan). Update lewat URL search params, pola client
 * component kecil seperti FilterWilker/FilterRentangMinggu yang sudah
 * ada di modul Vektor.
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const BULAN_LABEL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type Props = {
  tab: 'mingguan' | 'bulanan';
  tahun: number;
  minggu: number;
  bulan: number;
};

export default function KontrolPeriode({ tab, tahun, minggu, bulan }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(perubahan: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(perubahan)) {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-full border border-gray-200">
        <button
          type="button"
          onClick={() => updateParams({ tab: 'mingguan' })}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'mingguan' ? 'bg-[#0F2A38] text-white' : 'bg-white text-gray-600'
          }`}
        >
          Mingguan
        </button>
        <button
          type="button"
          onClick={() => updateParams({ tab: 'bulanan' })}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'bulanan' ? 'bg-[#0F2A38] text-white' : 'bg-white text-gray-600'
          }`}
        >
          Bulanan
        </button>
      </div>

      {tab === 'mingguan' ? (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Tahun</label>
          <input
            type="number"
            defaultValue={tahun}
            onBlur={(e) => updateParams({ tahun: e.target.value })}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1"
          />
          <label className="text-gray-500">Minggu Epid</label>
          <input
            type="number"
            min={1}
            max={53}
            defaultValue={minggu}
            onBlur={(e) => updateParams({ minggu: e.target.value })}
            className="w-16 rounded-lg border border-gray-200 px-2 py-1"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Tahun</label>
          <input
            type="number"
            defaultValue={tahun}
            onBlur={(e) => updateParams({ tahun: e.target.value })}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1"
          />
          <label className="text-gray-500">Bulan</label>
          <select
            defaultValue={bulan}
            onChange={(e) => updateParams({ bulan: e.target.value })}
            className="rounded-lg border border-gray-200 px-2 py-1"
          >
            {BULAN_LABEL.map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}