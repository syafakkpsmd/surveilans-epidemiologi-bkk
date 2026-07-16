"use client";

import {
  LineChart,
  Line,
  BarChart, // <-- Ditambahkan untuk mendukung grafik batang
  Bar,      // <-- Ditambahkan untuk mendukung grafik batang
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface TitikTren {
  label: string;
  [seri: string]: string | number;
}

interface SeriGaris {
  dataKey: string;
  nama: string;
  warna: string;
  putusPutus?: boolean;
}

// 1. MODIFIKASI PROPS: Kita tambahkan opsi variant tanpa mengganggu data & seri asli
interface TrenChartProps {
  data: TitikTren[];
  seri: SeriGaris[];
  variant?: "line" | "bar"; // <-- Properti baru (opsional)
}

export function TrenChart({ data, seri, variant = "line" }: TrenChartProps) {
  
  // ==========================================
  // KONDISI A: JIKA VARIANT ADALAH "BAR" (BATANG)
  // ==========================================
  if (variant === "bar") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {/* Tetap menggunakan grid bawaan kode Anda */}
          <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" />
          {/* Ukuran font & interval tetap sama sesuai setelan asli Anda */}
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {/* Perulangan untuk menggambar Batang Grafik */}
          {seri.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.nama}
              fill={s.warna}
              radius={[4, 4, 0, 0]} // Sudut atas batang dibuat melengkung halus
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ==========================================
  // KONDISI B: DEFAULT / KODE ASLI LOGIKA GARIS (LINE)
  // ==========================================
  // Bagian di bawah ini sama persis dengan kode original Anda, tidak ada yang dikurangi.
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        {seri.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.nama}
            stroke={s.warna}
            strokeWidth={s.putusPutus ? 1.5 : 2}
            dot={false}
            strokeDasharray={s.putusPutus ? "4 3" : undefined}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}