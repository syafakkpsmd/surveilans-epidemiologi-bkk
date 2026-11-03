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
  ReferenceLine,
} from 'recharts';

export interface DataBulanan {
  bulanLabel: string;
  hi_rerata: number | null;
  ci_rerata: number | null;
  bi_rerata: number | null;
  abj_rerata: number | null;
  curah_hujan_rerata?: number | null;
}

// BARU -- axis sekarang 3 pilihan: 'kiri' (HI/CI/BI, domain auto kecil),
// 'kanan-abj' (ABJ, domain tetap 0-100, sumbu kanan SENDIRI terpisah
// dari curah hujan supaya tidak menenggelamkan skala HI/CI/BI di kiri),
// 'kanan-hujan' (Curah Hujan, sumbu kanan sendiri juga). Recharts
// otomatis menggeser posisi tiap sumbu kanan tambahan (tidak saling
// menumpuk) selama yAxisId-nya beda.
const SERIES_BULANAN = [
  { key: 'hi_rerata', label: 'HI (%)', warna: '#B71C1C', axis: 'kiri' as const, tipe: 'bar' as const },
  { key: 'ci_rerata', label: 'CI (%)', warna: '#EF6C00', axis: 'kiri' as const, tipe: 'bar' as const },
  { key: 'bi_rerata', label: 'BI (%)', warna: '#7C3AED', axis: 'kiri' as const, tipe: 'bar' as const },
  { key: 'abj_rerata', label: 'ABJ (%)', warna: '#2F9E44', axis: 'kanan-abj' as const, tipe: 'bar' as const },
  { key: 'curah_hujan_rerata', label: 'Curah Hujan (mm)', warna: '#0F4C5C', axis: 'kanan-hujan' as const, tipe: 'line' as const },
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

export interface AmbangBatasBulanan {
  /** Nilai Y tempat garis digambar di sumbu kiri (HI/CI/BI), mis. 1 untuk Ambang Bahaya. */
  nilai: number;
  /** Ditampilkan sebagai badge DI ATAS chart, bukan menempel di garis. */
  label?: string;
  /** Default amber gelap (#DC2626) -- lebih profesional daripada kuning terang. */
  warna?: string;
}

export default function TrenChartBulanan({
  data,
  ambangBatas = { nilai: 1, label: 'Threshold (>1)' },
}: {
  data: DataBulanan[];
  /** Garis referensi horizontal di sumbu kiri untuk HI/CI/BI. Default: nilai 1 (Ambang Bahaya). Oper `undefined`/`null` untuk mematikan. */
  ambangBatas?: AmbangBatasBulanan | null;
}) {
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
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bulanLabel" />
          <YAxis
            yAxisId="kiri"
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2) || 10]}
          />
          <YAxis yAxisId="kanan-abj" orientation="right" domain={[0, 100]} tick={{ fill: '#2F9E44' }} />
          <YAxis yAxisId="kanan-hujan" orientation="right" tick={{ fill: '#0F4C5C' }} />
          <Tooltip
            labelFormatter={(v) => `Minggu Epid ke-${v}`}
            formatter={(value: any, name: any) => [
              typeof value === 'number' ? value.toFixed(2) : (value ?? ''),
              name,
            ]}
          />
          <Legend />
          {ambangBatas && (
            <ReferenceLine
              yAxisId="kiri"
              y={ambangBatas.nilai}
              stroke={ambangBatas.warna ?? '#DC2626'}
              strokeWidth={2}
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
            />
          )}
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

      {ambangBatas && (
        <div className="mb-2 flex justify-center">
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              color: ambangBatas.warna ?? '#DC2626',
              backgroundColor: `${ambangBatas.warna ?? '#DC2626'}1A`,
            }}
          >
            ⚠ {ambangBatas.label ?? `Threshold (>${ambangBatas.nilai})`}
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
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
    </div>
  );
}