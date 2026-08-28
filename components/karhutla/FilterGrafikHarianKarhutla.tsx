'use client';

import PilihWilayahMultiSelect from './PilihWilayahMultiSelect';
import { buatOpsiWilayahIspa } from '@/lib/karhutla/constants';
import type { WilayahIspaRow } from '@/lib/supabase/queries-karhutla-server';

export interface StateFilterHarian {
  tanggalAwal: string;
  tanggalAkhir: string;
  wilayahKeys: string[];
  parameter: 'pm25' | 'pm10' | 'suhu' | 'hcho' | 'tvoc' | 'kelembapan';
}

const PILIHAN_PARAMETER: { value: StateFilterHarian['parameter']; label: string }[] = [
  { value: 'pm25', label: 'PM2.5' },
  { value: 'pm10', label: 'PM10' },
  { value: 'suhu', label: 'Suhu' },
  { value: 'hcho', label: 'HCHO' },
  { value: 'tvoc', label: 'TVOC' },
  { value: 'kelembapan', label: 'Kelembapan' },
];

export default function FilterGrafikHarianKarhutla({
  nilai,
  onUbah,
  daftarWilayahIspa,
}: {
  nilai: StateFilterHarian;
  onUbah: (nilaiBaru: StateFilterHarian) => void;
  daftarWilayahIspa: WilayahIspaRow[];
}) {
  const opsiWilayah = buatOpsiWilayahIspa(daftarWilayahIspa);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Dari</label>
          <input
            type="date"
            value={nilai.tanggalAwal}
            onChange={(e) => onUbah({ ...nilai, tanggalAwal: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sampai</label>
          <input
            type="date"
            value={nilai.tanggalAkhir}
            onChange={(e) => onUbah({ ...nilai, tanggalAkhir: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Wilayah (ISPA)</label>
          <PilihWilayahMultiSelect
            opsi={opsiWilayah}
            nilai={nilai.wilayahKeys}
            onUbah={(wilayahKeys) => onUbah({ ...nilai, wilayahKeys })}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Parameter Udara</label>
          <select
            value={nilai.parameter}
            onChange={(e) => onUbah({ ...nilai, parameter: e.target.value as StateFilterHarian['parameter'] })}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {PILIHAN_PARAMETER.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {nilai.tanggalAwal > nilai.tanggalAkhir && (
        <p className="text-xs text-red-600">Tanggal awal tidak boleh lebih besar dari tanggal akhir.</p>
      )}
    </div>
  );
}