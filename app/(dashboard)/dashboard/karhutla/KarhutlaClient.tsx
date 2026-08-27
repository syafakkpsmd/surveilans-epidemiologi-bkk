'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import FormInputIspaHarian from '@/components/karhutla/FormInputIspaHarian';
import KurvaEpidemikIspaPm25, { type TitikTrenIspa } from '@/components/karhutla/KurvaEpidemikIspaPm25';
import { DAFTAR_WILAYAH_KARHUTLA } from '@/lib/karhutla/constants';
import type { HotspotRow } from '@/components/karhutla/PetaHotspotKarhutla';

// Leaflet butuh window -> wajib dynamic import tanpa SSR (pola sama dgn PetaWilker existing)
const PetaHotspotKarhutla = dynamic(() => import('@/components/karhutla/PetaHotspotKarhutla'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm h-105 flex items-center justify-center text-sm text-gray-400">
      Memuat peta...
    </div>
  ),
});

export default function KarhutlaClient({
  trenAwal,
  hotspotAwal,
}: {
  trenAwal: TitikTrenIspa[];
  hotspotAwal: HotspotRow[];
}) {
  const [tren, setTren] = useState(trenAwal);
  const [filterWilayah, setFilterWilayah] = useState('Semua');
  const [isPending, startTransition] = useTransition();

  async function muatUlangTren(wilayahKey: string) {
    setFilterWilayah(wilayahKey);
    startTransition(async () => {
      const res = await fetch(`/api/tren-ispa?wilayah=${encodeURIComponent(wilayahKey)}`);
      if (res.ok) {
        const json = await res.json();
        setTren(json.data);
      }
    });
  }

  return (
    <div className="space-y-6">
      <PetaHotspotKarhutla hotspots={hotspotAwal} />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter wilayah untuk kurva:</label>
        <select
          value={filterWilayah}
          onChange={(e) => muatUlangTren(e.target.value)}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="Semua">Semua Wilayah</option>
          {DAFTAR_WILAYAH_KARHUTLA.map((w) => (
            <option key={w.label} value={w.zona ? `${w.kode_wilker}::${w.zona}` : w.kode_wilker}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      <KurvaEpidemikIspaPm25 data={tren} />

      <FormInputIspaHarian onBerhasilSimpan={() => muatUlangTren(filterWilayah)} />
    </div>
  );
}