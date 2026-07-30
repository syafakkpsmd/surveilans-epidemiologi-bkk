'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function ToggleGranularitas({
  granularitasAktif,
}: {
  granularitasAktif: 'mingguan' | 'bulanan';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pindah(granularitas: 'mingguan' | 'bulanan') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('granularitas', granularitas);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
      <button
        type="button"
        onClick={() => pindah('mingguan')}
        className={`rounded-md px-3 py-1.5 transition-all ${
          granularitasAktif === 'mingguan'
            ? 'bg-[#0F4C5C] text-white shadow-xs'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Mingguan
      </button>
      <button
        type="button"
        onClick={() => pindah('bulanan')}
        className={`rounded-md px-3 py-1.5 transition-all ${
          granularitasAktif === 'bulanan'
            ? 'bg-[#0F4C5C] text-white shadow-xs'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Bulanan
      </button>
    </div>
  );
}