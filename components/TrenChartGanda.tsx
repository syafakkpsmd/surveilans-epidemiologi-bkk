"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface TitikTrenGanda {
  label: string;
  [seri: string]: string | number;
}

export interface SeriDef {
  dataKey: string;
  nama: string;
  warna: string;
  sumbu?: "kiri" | "kanan";
}

interface TrenChartGandaProps {
  data: TitikTrenGanda[];
  tipe: "garis" | "batang";
  seriAbk: SeriDef[];
  seriKapalTotal: SeriDef[];
  judulAbk?: string;
  judulKapalTotal?: string;
}

function PanelChart({
  data,
  tipe,
  seri,
  judul,
}: {
  data: TitikTrenGanda[];
  tipe: "garis" | "batang";
  seri: SeriDef[];
  judul: string;
}) {
  const adaSumbuKanan = seri.some((s) => s.sumbu === "kanan");

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{judul}</h3>
      <ResponsiveContainer width="100%" height={260}>
        {tipe === "garis" ? (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kiri" tick={{ fontSize: 11 }} />
            {adaSumbuKanan && <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 11 }} />}
            <Tooltip />
            <Legend />
            {seri.map((s) => (
              <Line
                key={s.dataKey}
                yAxisId={s.sumbu === "kanan" ? "kanan" : "kiri"}
                type="monotone"
                dataKey={s.dataKey}
                name={s.nama}
                stroke={s.warna}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kiri" tick={{ fontSize: 11 }} />
            {adaSumbuKanan && <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 11 }} />}
            <Tooltip cursor={{ fill: "rgba(15,76,92,0.06)" }} />
            <Legend />
            {seri.map((s) => (
              <Bar
                key={s.dataKey}
                yAxisId={s.sumbu === "kanan" ? "kanan" : "kiri"}
                dataKey={s.dataKey}
                name={s.nama}
                fill={s.warna}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function TrenChartGanda({
  data,
  tipe,
  seriAbk,
  seriKapalTotal,
  judulAbk = "ABK WNA vs WNI",
  judulKapalTotal = "Total ABK & Jumlah Kapal",
}: TrenChartGandaProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PanelChart data={data} tipe={tipe} seri={seriAbk} judul={judulAbk} />
      <PanelChart data={data} tipe={tipe} seri={seriKapalTotal} judul={judulKapalTotal} />
    </div>
  );
}