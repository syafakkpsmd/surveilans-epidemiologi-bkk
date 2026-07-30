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
  LabelList,
} from "recharts";

type SeriesItem = {
  key: string;
  label: string;
  warna: string;
};

type TrenChartLineProps = {
  data: any[];
  seriesList: SeriesItem[];
  tipeChart?: "line" | "bar";
  /**
   * BARU: kalau true, tampilkan angka jumlah di atas tiap bar (hanya
   * berlaku untuk tipeChart="bar" -- diabaikan untuk "line" karena
   * garis dengan banyak titik+angka jadi penuh sesak/tidak terbaca).
   * Default false supaya chart yang sudah pakai komponen ini di
   * halaman lain (Rat Guard, breakdown, dll) tidak berubah tampilan
   * tanpa diminta.
   */
  tampilkanNilai?: boolean;
};

const formatNilai = (value: unknown) => {
  const angka = typeof value === "number" ? value : Number(value);
  return Number.isFinite(angka) ? angka.toLocaleString("id-ID") : String(value ?? "");
};

export default function TrenChartLine({
  data,
  seriesList,
  tipeChart = "line",
  tampilkanNilai = false,
}: TrenChartLineProps) {
  return (
    <div className="h-75 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {tipeChart === "bar" ? (
          <BarChart data={data} margin={{ top: tampilkanNilai ? 24 : 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            {seriesList.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.warna} radius={[4, 4, 0, 0]}>
                {tampilkanNilai && (
                  <LabelList
                    dataKey={s.key}
                    position="top"
                    formatter={formatNilai}
                    style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            {seriesList.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.warna}
                strokeWidth={2}
                activeDot={{ r: 6 }}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}