'use client';

// ================================================================
// SEGMEN 11 — components/vektor/TrenChartMingguan.tsx
// Chart generik untuk tren mingguan, dengan toggle checkbox per
// series. Pakai ComposedChart supaya tiap series bisa punya tipe
// render sendiri (Line atau Bar) -- misal Curah Hujan digambar
// sebagai Bar sementara HI/CI/BI/ABJ tetap Line.
//
// MULTI-AXIS KANAN: tiap series dengan axis:'kanan' dapat sumbu Y
// KANAN SENDIRI (yAxisId unik per key), bukan berbagi satu sumbu
// kanan yang sama. Jadi kalau user mengaktifkan suhu + kelembaban +
// curah hujan sekaligus, ketiganya masing-masing dapat skala sendiri
// -- tidak saling menenggelamkan, dan metrik utama di sumbu kiri
// tetap terbaca. Warna tick tiap sumbu kanan mengikuti warna garis
// series-nya supaya gampang dikenali. Tidak ada perubahan API di
// pemanggil (tetap axis: 'kanan' seperti biasa) -- semua halaman yang
// sudah pakai komponen ini otomatis dapat perilaku baru ini.
//
// BARU -- ambangBatas: garis horizontal referensi (ReferenceLine) di
// sumbu KIRI, dipakai mis. untuk menandai batas waspada HI/CI/BI > 1.
// Opsional -- kalau tidak dioper, tidak ada garis sama sekali (tidak
// mengubah tampilan halaman yang belum butuh ini).
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
  ReferenceLine,
} from 'recharts';

export interface SeriesTren {
  key: string;
  label: string;
  warna: string;
  axis?: 'kiri' | 'kanan';
  /** Default 'line'. Set 'bar' untuk series yang mau digambar sebagai batang (mis. Curah Hujan). */
  tipe?: 'line' | 'bar';
}

export interface AmbangBatasTren {
  /** Nilai Y tempat garis digambar, mis. 1 untuk Ambang Bahaya HI/CI/BI. */
  nilai: number;
  /** Default: `Ambang Bahaya (>{nilai})`. Ditampilkan sebagai badge DI ATAS chart, bukan menempel di garis. */
  label?: string;
  /** Default amber gelap (#DC2626) -- lebih profesional daripada kuning terang, tetap beda dari warna series lain. */
  warna?: string;
}

/** yAxisId unik untuk tiap series yang minta sumbu kanan sendiri. */
function idSumbuKanan(key: string) {
  return `kanan-${key}`;
}

export default function TrenChartMingguan({
  judul,
  data,
  seriesList,
  labelSumbuX = 'minggu_epid',
  ambangBatas,
}: {
  judul?: string;
  data: Record<string, unknown>[];
  seriesList: SeriesTren[];
  labelSumbuX?: string;
  /** Garis referensi horizontal di sumbu kiri (mis. Ambang Bahaya HI/CI/BI > 1). Opsional. */
  ambangBatas?: AmbangBatasTren;
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

  const seriesTerlihat = seriesList.filter((s) => seriesAktif.has(s.key));
  const seriesKanan = seriesTerlihat.filter((s) => s.axis === 'kanan');

  return (
    <div>
      {judul && (
        <h3 className="mb-2 text-center text-sm font-semibold text-gray-700">{judul}</h3>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey={labelSumbuX}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `Mg-${v}`}
          />
          <YAxis yAxisId="kiri" tick={{ fontSize: 11 }} />
          {seriesKanan.map((s) => (
            <YAxis
              key={idSumbuKanan(s.key)}
              yAxisId={idSumbuKanan(s.key)}
              orientation="right"
              tick={{ fontSize: 11, fill: s.warna }}
              stroke={s.warna}
              tickLine={{ stroke: s.warna }}
              axisLine={{ stroke: s.warna }}
            />
          ))}
          <Tooltip
            labelFormatter={(v) => `Minggu Epid ke-${v}`}
            formatter={(value: any, name: any) => [
              typeof value === 'number' ? value.toFixed(2) : (value ?? ''),
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
          {seriesTerlihat.map((s) => {
            const yAxisId = s.axis === 'kanan' ? idSumbuKanan(s.key) : 'kiri';
            return s.tipe === 'bar' ? (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.warna}
                yAxisId={yAxisId}
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
                yAxisId={yAxisId}
                connectNulls
              />
            );
          })}
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
            {ambangBatas.label ?? `Ambang Bahaya (>${ambangBatas.nilai})`}
          </span>
        </div>
      )}

      {/* Checkbox toggle per series */}
      <div className="mt-2 flex flex-wrap gap-3">
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
    </div>
  );
}