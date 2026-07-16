'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

export interface SeriesBar {
  key: string;
  label: string;
  warna: string;
  axis?: 'kiri' | 'kanan';
  desimal?: number; // default 0 -- pakai 1-2 untuk satuan seperti hektar
}

const LABEL_KONTRAS = {
  fontSize: 10,
  fontWeight: 700,
  fill: '#1e293b',
  paintOrder: 'stroke' as const,
  stroke: '#ffffff',
  strokeWidth: 3,
};

export default function GrafikBarBulanan({
  judul,
  data,
  seriesList,
  labelSumbuX = 'bulanLabel',
}: {
  judul: string;
  data: Record<string, unknown>[];
  seriesList: SeriesBar[];
  labelSumbuX?: string;
}) {
  const [seriesTerpilih, setSeriesTerpilih] = useState<string[]>(
    seriesList.map((s) => s.key)
  );

  function toggleSeries(key: string) {
    setSeriesTerpilih((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const seriesAktif = seriesList.filter((s) => seriesTerpilih.includes(s.key));
  const pakaiDuaSumbu = seriesAktif.some((s) => s.axis === 'kanan');

  if (!data.length) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{judul}</h3>
        <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
          Belum ada data untuk periode ini.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{judul}</h3>

      {seriesAktif.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          Pilih minimal 1 kategori untuk ditampilkan.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 20, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={labelSumbuX} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="kiri" tick={{ fontSize: 11 }} />
            {pakaiDuaSumbu && <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 11 }} />}
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {seriesAktif.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.warna}
                yAxisId={s.axis === 'kanan' ? 'kanan' : 'kiri'}
              >
                <LabelList
                  dataKey={s.key}
                  position="top"
                  style={LABEL_KONTRAS}
                  formatter={(v: any) =>
                    typeof v === 'number' ? v.toFixed(s.desimal ?? 0) : (v ?? '')
                  }
                />
              </Bar>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
        {seriesList.map((s) => (
          <label
            key={s.key}
            className="flex cursor-pointer items-center gap-2 text-xs text-gray-600"
          >
            <input
              type="checkbox"
              checked={seriesTerpilih.includes(s.key)}
              onChange={() => toggleSeries(s.key)}
              className="h-3.5 w-3.5 rounded"
              style={{ accentColor: s.warna }}
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.warna }}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}