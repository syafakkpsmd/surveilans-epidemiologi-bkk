"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown kalau klik di luar area-nya
  useEffect(() => {
    function handleClickLuar(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownTerbuka(false);
      }
    }
    document.addEventListener("mousedown", handleClickLuar);
    return () => document.removeEventListener("mousedown", handleClickLuar);
  }, []);

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

  // Label ringkas untuk tombol dropdown: nama negara kalau cuma sedikit terpilih,
  // atau cukup jumlahnya kalau banyak.
  const labelTombol =
    seriesAktif.length === 0
      ? "Pilih negara..."
      : seriesAktif.length <= 2
      ? seriesAktif.map((s) => s.label).join(", ")
      : `${seriesAktif.length} negara terpilih`;

  return (
    <div className="space-y-4">
      <div ref={dropdownRef} className="relative w-full max-w-sm">
        <button
          type="button"
          onClick={() => setDropdownTerbuka((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-ink"
        >
          <span className="truncate">{labelTombol}</span>
          <span className="ml-2 shrink-0 text-muted">{dropdownTerbuka ? "▲" : "▼"}</span>
        </button>

        {dropdownTerbuka && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface p-3 shadow-lg">
            <input
              type="text"
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              placeholder="Cari negara..."
              autoFocus
              className="mb-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-ink placeholder:text-muted"
            />

            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={pilihSemua}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ink hover:bg-slate-100"
              >
                Pilih Semua ({seriesTerfilter.length})
              </button>
              <button
                type="button"
                onClick={hapusSemua}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ink hover:bg-slate-100"
              >
                Hapus Semua
              </button>
              <span className="ml-auto text-xs text-muted">{seriesAktif.length} terpilih</span>
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto">
              {seriesTerfilter.map((s) => (
                <label
                  key={s.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-100"
                >
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
                <p className="px-1.5 py-1 text-sm text-muted">Tidak ada negara yang cocok.</p>
              )}
            </div>
          </div>
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