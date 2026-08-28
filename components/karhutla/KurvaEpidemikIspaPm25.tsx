'use client';

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export interface TitikTrenIspa {
  tanggal: string;
  kasus_ispa_anak: number;
  kasus_ispa_dewasa: number;
  pm25_rerata: number | null;
  jumlah_titik_api: number | null; // BARU: jumlah hotspot terdeteksi pada tanggal itu
}

const AMBANG_PM25_TIDAK_SEHAT = 55;

export default function KurvaEpidemikIspaPm25({ data }: { data: TitikTrenIspa[] }) {
  const chartData = data.map((d) => ({
    tanggal: new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    'ISPA Anak': d.kasus_ispa_anak,
    'ISPA Dewasa': d.kasus_ispa_dewasa,
    'PM2.5 (µg/m³)': d.pm25_rerata,
    'Titik Api': d.jumlah_titik_api,
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Kurva Epidemik: Kasus ISPA vs PM2.5 vs Titik Api
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Batang = jumlah kasus harian (sumbu kiri) &middot; Garis ungu = rerata PM2.5 &middot; Garis merah = jumlah titik api (keduanya sumbu kanan)
      </p>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">Belum ada data pada rentang ini.</p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="kiri" tick={{ fontSize: 12 }} label={{ value: 'Jumlah Kasus', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'PM2.5 (µg/m³)', angle: 90, position: 'insideRight', fontSize: 12 }} />
            <YAxis yAxisId="kanan2" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Titik Api', angle: 90, position: 'insideRight', fontSize: 12 }} />
            <Tooltip />
            <Legend />

            <Bar yAxisId="kiri" dataKey="ISPA Anak" fill="#F97316" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="kiri" dataKey="ISPA Dewasa" fill="#FB923C" radius={[3, 3, 0, 0]} />

            <Line yAxisId="kanan" type="monotone" dataKey="PM2.5 (µg/m³)" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line yAxisId="kanan2" type="monotone" dataKey="Titik Api" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} connectNulls />

            <ReferenceLine
              yAxisId="kanan"
              y={AMBANG_PM25_TIDAK_SEHAT}
              stroke="#DC2626"
              strokeDasharray="4 4"
              label={{ value: 'Ambang Tidak Sehat', position: 'insideTopRight', fontSize: 10, fill: '#DC2626' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}