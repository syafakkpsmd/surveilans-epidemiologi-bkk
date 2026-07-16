'use client';

/**
 * TrenPerWilkerChart
 * -------------------
 * Chart garis lebar (full width) untuk membandingkan tren kedatangan
 * kapal MINGGUAN antar 6 wilayah kerja sekaligus, dengan checkbox
 * toggle per wilayah supaya user bisa fokus membandingkan 2-3 wilayah
 * saja kalau grafiknya terlalu ramai.
 *
 * CATATAN: chart ini SELALU menampilkan data MINGGUAN, terlepas dari
 * tab Mingguan/Bulanan yang sedang aktif di halaman -- karena memang
 * dirancang berdiri sendiri di bagian atas halaman (lihat app/cop/page.tsx).
 *
 * CARA TAMBAH/KURANGI WILAYAH: tidak perlu ubah apa pun di file ini.
 * Cukup ubah array `seriesList` yang dikirim dari page.tsx (lihat
 * WILAYAH_URUTAN + PALET_WILAYAH di app/cop/page.tsx).
 */

import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface SeriesWilker {
  key: string;
  label: string;
  warna: string;
}

export function TrenPerWilkerChart({
  data,
  seriesList,
  tipe = 'garis',
}: {
  /** Satu baris data per minggu epid ATAU per bulan, kolom-kolomnya = nama wilayah kerja (key di seriesList). */
  data: Record<string, unknown>[];
  /** Daftar wilayah yang mau digambar sebagai garis/batang + warnanya masing-masing. */
  seriesList: SeriesWilker[];
  /** 'garis' untuk mingguan, 'batang' untuk bulanan. Default 'garis'. */
  tipe?: 'garis' | 'batang';
}) {
  /** State checkbox: wilayah mana saja yang sedang ditampilkan garisnya. Default: semua aktif. */
  const [aktif, setAktif] = useState<Set<string>>(new Set(seriesList.map((s) => s.key)));

  /** Nyala/matikan satu garis wilayah saat checkbox-nya diklik. */
  function toggle(key: string) {
    setAktif((prev) => {
      const baru = new Set(prev);
      if (baru.has(key)) baru.delete(key);
      else baru.add(key);
      return baru;
    });
  }

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-bg text-sm text-muted">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <div>
      {/* Baris checkbox -- 1 checkbox per wilayah kerja */}
      <div className="mb-3 flex flex-wrap gap-4">
        {seriesList.map((s) => (
          <label key={s.key} className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={aktif.has(s.key)}
              onChange={() => toggle(s.key)}
              style={{ accentColor: s.warna }}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {seriesList
            .filter((s) => aktif.has(s.key))
            .map((s) =>
              tipe === 'batang' ? (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.warna} />
              ) : (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.warna}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              )
            )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}