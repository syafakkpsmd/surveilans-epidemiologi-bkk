'use client';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function GrafikInsektisidaVsLuas({ data, warna }: { data: any[]; warna: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="minggu_epid" tickFormatter={(v) => `Mg-${v}`} />
        <YAxis yAxisId="kiri" />
        <YAxis yAxisId="kanan" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="kiri" dataKey="jumlah_insektisida_rerata" name="Insektisida" fill={warna} />
        <Line yAxisId="kanan" dataKey="luas_area_rerata" name="Luas Area (m²)" stroke="#1D4ED8" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}