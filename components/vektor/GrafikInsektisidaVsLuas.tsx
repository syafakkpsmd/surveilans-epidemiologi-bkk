'use client';

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';

interface GrafikInsektisidaVsLuasProps {
  data: Record<string, any>[];
  warna?: string;
  isBulanan?: boolean;
}

// Helper Format Angka
const formatAngka = (val: any) => {
  if (val === undefined || val === null || val === '') return '';
  const num = Number(val);
  if (isNaN(num) || num === 0) return ''; // Jangan tampilkan label jika 0 agar tidak semak
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

export default function GrafikInsektisidaVsLuas({
  data = [],
  warna = '#8B5CF6',
  isBulanan = false,
}: GrafikInsektisidaVsLuasProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
        Data insektisida & luas area tidak tersedia
      </div>
    );
  }

  const normalizedData = data.map((item) => {
    const labelX = isBulanan
      ? item.bulanLabel || item.bulan || item.label || ''
      : item.minggu_epid
      ? `Mg-${item.minggu_epid}`
      : item.label || '';

    const insektisida = Number(
      item.jumlah_insektisida_rerata ??
        item.jumlah_insektisida ??
        item.insektisida_total ??
        item.insektisida_rerata ??
        item.total_insektisida ??
        item.insektisida ??
        0
    );

    const luasArea = Number(
      item.luas_area_rerata ??
        item.luas_area ??
        item.luas_total ??
        item.total_luas ??
        item.luas_m2 ??
        item.luas ??
        0
    );

    return {
      labelX,
      insektisida,
      luasArea,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
  <ComposedChart
    data={normalizedData}
    // 1. Tambah margin atas jadi 35px agar angka di atas tidak terpotong
    margin={{ top: 35, right: 15, left: -15, bottom: 0 }}
  >
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />

    <XAxis dataKey="labelX" tick={{ fontSize: 11, fill: '#4B5563' }} />

    {/* 2. Beri domain [0, 'dataMax + 40'] pada Sumbu Kiri (Insektisida) agar grafik tidak mepet ke paling atas */}
    <YAxis
      yAxisId="kiri"
      tick={{ fontSize: 11, fill: '#4B5563' }}
      allowDecimals={false}
      domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
    />

    {/* 3. Beri domain pada Sumbu Kanan (Luas Area) */}
    <YAxis
      yAxisId="kanan"
      orientation="right"
      tick={{ fontSize: 11, fill: '#4B5563' }}
      allowDecimals={false}
      domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]}
    />

    <Tooltip
      contentStyle={{
        borderRadius: '8px',
        fontSize: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
      formatter={(value: any, name: any) => [
        formatAngka(value),
        name === 'insektisida' ? 'Insektisida' : 'Luas Area (m²)',
      ]}
    />

    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

    {/* BAR INSEKTISIDA — Angka ditaruh sedikit di dalam bagian atas batang (insideTop) */}
    <Bar
      yAxisId="kiri"
      dataKey="insektisida"
      name="Insektisida"
      fill={warna}
      radius={[4, 4, 0, 0]}
      barSize={isBulanan ? 18 : 14}
    >
      <LabelList
        dataKey="insektisida"
        position="insideTop"
        dy={6} // Turun sedikit ke dalam batang agar bersih dari garis
        formatter={formatAngka}
        style={{ fontSize: '10px', fill: '#070000', fontWeight: 700 }} // Warna putih agar terbaca jelas di dalam batang
      />
    </Bar>

    {/* LINE LUAS AREA — Angka ditarik LEBIH ATAS (dy={-20}) */}
    {isBulanan ? (
      <Bar
        yAxisId="kanan"
        dataKey="luasArea"
        name="Luas Area (m²)"
        fill="#3B82F6"
        radius={[4, 4, 0, 0]}
        barSize={18}
      >
        <LabelList
          dataKey="luasArea"
          position="top"
          dy={-6}
          formatter={formatAngka}
          style={{ fontSize: '10px', fill: '#2563EB', fontWeight: 600 }}
        />
      </Bar>
    ) : (
      <Line
        yAxisId="kanan"
        type="monotone"
        dataKey="luasArea"
        name="Luas Area (m²)"
        stroke="#2563EB"
        strokeWidth={2}
        dot={{ r: 4, fill: '#2563EB' }}
      >
        <LabelList
          dataKey="luasArea"
          position="top"
          dy={-20} // Mendorong angka 16 jauh lebih ke atas
          formatter={formatAngka}
          style={{ fontSize: '10px', fill: '#2563EB', fontWeight: 700 }}
        />
      </Line>
    )}
  </ComposedChart>
</ResponsiveContainer>
  );
}