'use client';

// ================================================================
// SEGMEN 11 — components/vektor/TrenChartMingguan.tsx
// Chart generik untuk tren mingguan, dengan toggle checkbox per
// series. Pakai ComposedChart supaya tiap series bisa punya tipe
// render sendiri (Line atau Bar) -- misal Curah Hujan digambar
// sebagai Bar sementara HI/CI/BI/ABJ tetap Line.
// ================================================================

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface SeriesTren {
  key: string;
  label: string;
  warna: string;
  axis?: 'kiri' | 'kanan';
  /** Default 'line'. Set 'bar' untuk series yang mau digambar sebagai batang (mis. Curah Hujan). */
  tipe?: 'line' | 'bar';
}

export default function TrenChartMingguan({
  data,
  seriesList,
  labelSumbuX = 'minggu_epid',
}: {
  data: Record<string, unknown>[];
  seriesList: SeriesTren[];
  labelSumbuX?: string;
}) {
  const [seriesAktif, setSeriesAktif] = useState<Set<string>>(
    new Set(seriesList.map((s) => s.key))
  );

  function toggleSeries(key: string) {
    setSeriesAktif((prev) => {
      const baru = new Set(prev);
      if (baru.has(key)) {
        baru.delete(key);
      } else {
        baru.add(key);
      }
      return baru;
    });
  }

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
        Belum ada data untuk rentang ini.
      </div>
    );
  }

  return (
    <div>
      {/* Checkbox toggle per series */}
      <div className="mb-2 flex flex-wrap gap-3">
        {seriesList.map((s) => (
          <label key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={seriesAktif.has(s.key)}
              onChange={() => toggleSeries(s.key)}
              style={{ accentColor: s.warna }}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey={labelSumbuX}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `Mg-${v}`}
          />
          <YAxis yAxisId="kiri" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(v) => `Minggu Epid ke-${v}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {seriesList
            .filter((s) => seriesAktif.has(s.key))
            .map((s) =>
              s.tipe === 'bar' ? (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.warna}
                  yAxisId={s.axis === 'kanan' ? 'kanan' : 'kiri'}
                />
              ) : (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.warna}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  yAxisId={s.axis === 'kanan' ? 'kanan' : 'kiri'}
                  connectNulls
                />
              )
            )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}