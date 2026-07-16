"use client";

import { useEffect, useRef, useState } from "react";
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

export interface SeriesChecklist {
  key: string;
  label: string;
  warna: string;
}

// 1. Tambahkan opsi variant ke interface Props tanpa mengubah properti asli Anda
interface TrenChecklistMingguanProps {
  data: Array<Record<string, string | number>>;
  seriesList: SeriesChecklist[];
  maxAktifDefault?: number;
  tampilan?: "inline" | "dropdown";
  variant?: "line" | "bar"; // <-- Properti baru (opsional)
}

export function TrenChecklistMingguan({
  data,
  seriesList,
  maxAktifDefault = 5,
  tampilan = "inline",
  variant = "line", // Default diatur ke "line" jika halaman utama tidak mengirimkannya
}: TrenChecklistMingguanProps) {
  const [aktif, setAktif] = useState<Set<string>>(
    new Set(seriesList.slice(0, maxAktifDefault).map((s) => s.key))
  );
  const [terbuka, setTerbuka] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKlikLuar(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    }
    document.addEventListener("mousedown", handleKlikLuar);
    return () => document.removeEventListener("mousedown", handleKlikLuar);
  }, []);

  function toggle(key: string) {
    setAktif((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted">Belum ada data untuk ditampilkan.</p>;
  }

  const daftarCheckbox = seriesList.map((s) => (
    <label
      key={s.key}
      className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs text-ink hover:bg-slate-50"
    >
      <input
        type="checkbox"
        checked={aktif.has(s.key)}
        onChange={() => toggle(s.key)}
        className="h-3.5 w-3.5"
        style={{ accentColor: s.warna }}
      />
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.warna }} />
      {s.label}
    </label>
  ));

  return (
    <div>
      {tampilan === "inline" ? (
        <div className="mb-4 flex flex-wrap gap-3">{daftarCheckbox}</div>
      ) : (
        <div className="relative mb-4 inline-block" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setTerbuka((v) => !v)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink"
          >
            {aktif.size} dari {seriesList.length} pelabuhan dipilih ▾
          </button>
          {terbuka && (
            <div className="absolute z-10 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
              {daftarCheckbox}
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        {/* 2. OPERATOR KONDISI: Pilih rendering BarChart atau LineChart berdasarkan properti variant */}
        {variant === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            {seriesList
              .filter((s) => aktif.has(s.key))
              .map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.warna}
                  //stackId="a" // Menumpuk batang ke atas agar visualisasi tetap rapi dan mudah dibandingkan
                  radius={[2, 2, 0, 0]}
                />
              ))}
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            {seriesList
              .filter((s) => aktif.has(s.key))
              .map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.warna}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}