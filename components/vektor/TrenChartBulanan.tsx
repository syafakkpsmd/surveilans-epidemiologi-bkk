'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

export interface DataBulanan {
  bulanLabel: string;
  hi_rerata: number | null;
  ci_rerata: number | null;
  bi_rerata: number | null;
  abj_rerata: number | null;
  curah_hujan_rerata?: number | null;
}

const SERIES_BULANAN = [
  { key: 'hi_rerata', label: 'HI (%)', warna: '#B71C1C', axis: 'pct' as const, tipe: 'bar' as const },
  { key: 'ci_rerata', label: 'CI (%)', warna: '#EF6C00', axis: 'pct' as const, tipe: 'bar' as const },
  { key: 'bi_rerata', label: 'BI (%)', warna: '#7C3AED', axis: 'pct' as const, tipe: 'bar' as const },
  { key: 'abj_rerata', label: 'ABJ (%)', warna: '#2F9E44', axis: 'pct' as const, tipe: 'bar' as const },
  { key: 'curah_hujan_rerata', label: 'Curah Hujan (mm)', warna: '#0F4C5C', axis: 'mm' as const, tipe: 'line' as const },
];

/** Sama persis dengan style kontras yang dipakai TrenChartMingguan & GrafikBarBulanan -- teks tebal + halo putih supaya terbaca di atas warna apa pun. */
const LABEL_KONTRAS = {
  fontSize: 10,
  fontWeight: 700,
  fill: '#1e293b',
  paintOrder: 'stroke' as const,
  stroke: '#ffffff',
  strokeWidth: 3,
};

export default function TrenChartBulanan({ data }: { data: DataBulanan[] }) {
  const [seriesAktif, setSeriesAktif] = useState<Set<string>>(
    new Set(SERIES_BULANAN.map((s) => s.key))
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

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Belum ada data bulanan untuk periode ini.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {SERIES_BULANAN.map((s) => (
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

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bulanLabel" />
          <YAxis
            yAxisId="pct"
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2) || 10]}
          />
          <YAxis yAxisId="mm" orientation="right" />
          <Tooltip
            formatter={(value: any, name: any) => [
              typeof value === 'number' ? value.toFixed(2) : (value ?? ''),
              name,
            ] as [string, string]}
          />
          <Legend />
          {SERIES_BULANAN.filter((s) => seriesAktif.has(s.key)).map((s) =>
            s.tipe === 'line' ? (
              <Line
                key={s.key}
                yAxisId={s.axis}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.warna}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              >
                <LabelList
                  dataKey={s.key}
                  position="top"
                  style={LABEL_KONTRAS}
                  formatter={(v: any) => (typeof v === 'number' ? v.toFixed(1) : (v ?? ''))}
                />
              </Line>
            ) : (
              <Bar
                key={s.key}
                yAxisId={s.axis}
                dataKey={s.key}
                fill={s.warna}
                name={s.label}
              >
                <LabelList
                  dataKey={s.key}
                  position="top"
                  style={LABEL_KONTRAS}
                  formatter={(v: any) => (typeof v === 'number' ? v.toFixed(2) : (v ?? ''))}
                />
              </Bar>
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}