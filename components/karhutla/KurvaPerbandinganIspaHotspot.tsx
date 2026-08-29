'use client';

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TitikPerbandinganIspaHotspot } from '@/lib/supabase/queries-karhutla-server';

export default function KurvaPerbandinganIspaHotspot({
  data,
  sumberLabel = 'ISPA harian (modul karhutla)',
}: {
  data: TitikPerbandinganIspaHotspot[];
  sumberLabel?: string;
}) {
  const chartData = data.map((d) => ({
    periode: d.periodeLabel,
    'Kasus ISPA': d.totalKasusIspa,
    'Jumlah Hotspot': d.jumlahHotspot,
    'PM2.5 Rerata': d.pm25Rerata,
  }));

  const totalKasus = data.reduce((a, d) => a + d.totalKasusIspa, 0);
  const totalHotspot = data.reduce((a, d) => a + d.jumlahHotspot, 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-900">
          Perbandingan Kasus ISPA vs Jumlah Hotspot
        </h3>
        <span className="text-xs text-gray-500">
          Total: {totalKasus} kasus &middot; {totalHotspot} titik panas
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Batang = kasus ISPA ({sumberLabel}, sumbu kiri) &middot; Garis merah = jumlah hotspot regional Kaltim (sumbu kanan)
      </p>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">Belum ada data pada rentang ini.</p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="kiri" tick={{ fontSize: 12 }} label={{ value: 'Kasus ISPA', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Jumlah Hotspot', angle: 90, position: 'insideRight', fontSize: 12 }} />
            <Tooltip />
            <Legend />

            <Bar yAxisId="kiri" dataKey="Kasus ISPA" fill="#F97316" radius={[3, 3, 0, 0]} />
            <Line yAxisId="kanan" type="monotone" dataKey="Jumlah Hotspot" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}