'use client';

// components/global-emerging/GlobalEmergingFilterBar.tsx
// Client Component: toggle Mingguan/Bulanan + filter penyakit & negara.
// Pola: update searchParams via router.push (konsisten dengan Segmen 6/7,
// bukan client-side state lokal), supaya URL selalu mencerminkan filter
// aktif dan halaman bisa di-share/bookmark.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA, type JenisPeriode } from '@/types/global-emerging.types';

interface GlobalEmergingFilterBarProps {
  jenisAktif: JenisPeriode;
  penyakitAktif?: string;
  negaraAktif?: string;
}

export default function GlobalEmergingFilterBar({
  jenisAktif,
  penyakitAktif,
  negaraAktif,
}: GlobalEmergingFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-white p-4 shadow-sm">
      {/* Toggle Mingguan/Bulanan */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {(['mingguan', 'bulanan'] as JenisPeriode[]).map((jenis) => (
          <button
            key={jenis}
            type="button"
            onClick={() => updateParam('jenis', jenis)}
            className={`px-4 py-2 text-sm font-medium transition ${
              jenisAktif === jenis
                ? 'bg-[#0F2A38] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {jenis === 'mingguan' ? 'Mingguan' : 'Bulanan'}
          </button>
        ))}
      </div>

      {/* Filter Penyakit */}
      <select
        value={penyakitAktif ?? ''}
        onChange={(e) => updateParam('penyakit', e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
      >
        <option value="">Semua Penyakit</option>
        {DAFTAR_PENYAKIT.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* Filter Negara */}
      <select
        value={negaraAktif ?? ''}
        onChange={(e) => updateParam('negara', e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
      >
        <option value="">Semua Negara</option>
        {DAFTAR_NEGARA.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      {(penyakitAktif || negaraAktif) && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-sm text-[#0F4C5C] underline"
        >
          Reset filter
        </button>
      )}
    </div>
  );
}
