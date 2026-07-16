'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface DataRbaBulanan {
  bulanLabel: string;
  risikoTinggi: number;
  risikoSedang: number;
  risikoRendah: number;
  tidakDiisi: number;
}

/** Warna disamakan persis dengan resolveRba() di DonutRba.tsx supaya konsisten. */
const WARNA = {
  tinggi: '#D62839',
  sedang: '#F0A202',
  rendah: '#2F9E44',
  tidakDiisi: '#94A3B8',
};

export function RbaBarBulanan({ data }: { data: DataRbaBulanan[] }) {
  const adaData = data.some(
    (d) => d.risikoTinggi + d.risikoSedang + d.risikoRendah + d.tidakDiisi > 0
  );

  if (!adaData) {
    return <p className="text-sm text-muted">Belum ada data untuk periode ini.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="bulanLabel" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="risikoTinggi" name="Risiko Tinggi" fill={WARNA.tinggi} />
        <Bar dataKey="risikoSedang" name="Risiko Sedang" fill={WARNA.sedang} />
        <Bar dataKey="risikoRendah" name="Risiko Rendah" fill={WARNA.rendah} />
        <Bar dataKey="tidakDiisi" name="Tidak Diisi" fill={WARNA.tidakDiisi} />
      </BarChart>
    </ResponsiveContainer>
  );
}