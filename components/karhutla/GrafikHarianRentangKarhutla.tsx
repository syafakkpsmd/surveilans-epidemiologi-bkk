'use client';

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TitikTrenHarianRentang } from '@/lib/supabase/queries-karhutla-server';

const LABEL_PARAMETER: Record<string, string> = {
  pm25: 'PM2.5 (µg/m³)',
  pm10: 'PM10 (µg/m³)',
  suhu: 'Suhu (°C)',
  hcho: 'HCHO (mg/m³)',
  tvoc: 'TVOC (mg/m³)',
  kelembapan: 'Kelembapan (%)',
};

export default function GrafikHarianRentangKarhutla({
  data,
  parameter,
}: {
  data: TitikTrenHarianRentang[];
  parameter: string;
}) {
  const labelParameter = LABEL_PARAMETER[parameter] ?? parameter;

  const chartData = data.map((d) => ({
    tanggal: new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    'Kasus ISPA Anak': d.kasus_ispa_anak,
    'Kasus ISPA Dewasa': d.kasus_ispa_dewasa,
    [labelParameter]: d.nilai_parameter_udara,
  }));

  const totalKasus = data.reduce((a, d) => a + d.kasus_ispa_anak + d.kasus_ispa_dewasa, 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-900">Grafik Harian: Kasus ISPA vs {labelParameter}</h3>
        <span className="text-xs text-gray-500">Total {totalKasus} kasus &middot; {data.length} hari</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Batang = kasus ISPA harian (sumbu kiri) &middot; Garis = {labelParameter} rerata regional (sumbu kanan)
      </p>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">Pilih rentang tanggal untuk menampilkan grafik.</p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kiri" tick={{ fontSize: 12 }} label={{ value: 'Kasus ISPA', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 12 }} label={{ value: labelParameter, angle: 90, position: 'insideRight', fontSize: 12 }} />
            <Tooltip />
            <Legend />

            <Bar yAxisId="kiri" dataKey="Kasus ISPA Anak" stackId="ispa" fill="#F97316" />
            <Bar yAxisId="kiri" dataKey="Kasus ISPA Dewasa" stackId="ispa" fill="#FB923C" radius={[3, 3, 0, 0]} />
            <Line yAxisId="kanan" type="monotone" dataKey={labelParameter} stroke="#7C3AED" strokeWidth={2} dot={{ r: 2 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}