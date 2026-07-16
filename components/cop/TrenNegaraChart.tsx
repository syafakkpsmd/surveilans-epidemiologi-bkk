"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface SeriesNegara {
  key: string;
  label: string;
  warna: string;
  total: number;
}

interface TrenNegaraChartProps {
  data: Array<Record<string, string | number>>;
  seriesList: SeriesNegara[];
  defaultSelectedCount?: number;
  tipe?: "garis" | "batang";   // <-- tambah ini
}

export function generateWarnaNegara(indeks: number): string {
  const hue = (indeks * 47) % 360;
  return `hsl(${hue} 65% 45%)`;
}

export function TrenNegaraChart({
  data,
  seriesList,
  defaultSelectedCount = 5,
  tipe = "garis",   // <-- tambah ini
}: TrenNegaraChartProps) {
  const [pencarian, setPencarian] = useState("");
  const [terpilih, setTerpilih] = useState<Set<string>>(
    () => new Set(seriesList.slice(0, defaultSelectedCount).map((s) => s.key))
  );

  const seriesTerfilter = useMemo(() => {
    const q = pencarian.trim().toLowerCase();
    if (!q) return seriesList;
    return seriesList.filter((s) => s.label.toLowerCase().includes(q));
  }, [pencarian, seriesList]);

  function toggle(key: string) {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function pilihSemua() {
    setTerpilih((prev) => {
      const next = new Set(prev);
      seriesTerfilter.forEach((s) => next.add(s.key));
      return next;
    });
  }

  function hapusSemua() {
    setTerpilih(new Set());
  }

  const seriesAktif = seriesList.filter((s) => terpilih.has(s.key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={pencarian}
          onChange={(e) => setPencarian(e.target.value)}
          placeholder="Cari negara..."
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-ink placeholder:text-muted"
        />
        <button
          type="button"
          onClick={pilihSemua}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-100"
        >
          Pilih Semua ({seriesTerfilter.length})
        </button>
        <button
          type="button"
          onClick={hapusSemua}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-100"
        >
          Hapus Semua
        </button>
        <span className="text-xs text-muted">{seriesAktif.length} negara terpilih</span>
      </div>

      <div className="flex max-h-32 flex-wrap gap-x-4 gap-y-2 overflow-y-auto rounded-md border border-border p-3">
        {seriesTerfilter.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={terpilih.has(s.key)}
              onChange={() => toggle(s.key)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.warna }} />
            <span className="text-ink">{s.label}</span>
            <span className="text-muted">({s.total})</span>
          </label>
        ))}
        {seriesTerfilter.length === 0 && (
          <p className="text-sm text-muted">Tidak ada negara yang cocok.</p>
        )}
      </div>

      {seriesAktif.length === 0 ? (
        <p className="text-sm text-muted">Pilih minimal 1 negara untuk menampilkan grafik.</p>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            {seriesAktif.map((s) =>
              tipe === "batang" ? (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.warna} />
              ) : (
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
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}