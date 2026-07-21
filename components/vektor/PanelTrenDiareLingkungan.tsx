'use client';

import { useState } from 'react';
import PanelTrenPeriode from '@/components/vektor/PanelTrenPeriode';

export type SeriKonfig = {
  key: string;
  label: string;
  warna: string;
  default?: boolean;
};

interface PanelTrenDiareLingkunganProps {
  judulBulanan: string;
  dataMingguan: Record<string, unknown>[];
  dataBulanan: Record<string, unknown>[];
  metrikUtama: SeriKonfig;
  seriTambahan: SeriKonfig[];
}

export default function PanelTrenDiareLingkungan({
  judulBulanan,
  dataMingguan,
  dataBulanan,
  metrikUtama,
  seriTambahan,
}: PanelTrenDiareLingkunganProps) {
  // State untuk checklist seri variabel tambahan (misal: suhu, kelembaban, dll.)
  const [aktif, setAktif] = useState<Set<string>>(
    () => new Set(seriTambahan.filter((s) => s.default).map((s) => s.key))
  );

  const toggle = (key: string) => {
    setAktif((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Menggabungkan metrik utama dengan seri tambahan yang dicentang
  const seriAktif = [metrikUtama, ...seriTambahan.filter((s) => aktif.has(s.key))];

  return (
    <div className="space-y-3">
      {/* Checkbox Seri Tambahan */}
      <div className="flex flex-wrap gap-4 text-xs">
        {seriTambahan.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-1.5 select-none">
            <input
              type="checkbox"
              checked={aktif.has(s.key)}
              onChange={() => toggle(s.key)}
              style={{ accentColor: s.warna }}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <span style={{ color: s.warna }} className="font-medium">
              {s.label}
            </span>
          </label>
        ))}
      </div>

      {/* Komponen Rendering Tren Periode */}
      <PanelTrenPeriode
        judulBulanan={judulBulanan}
        dataMingguan={dataMingguan}
        dataBulanan={dataBulanan}
        seriesListMingguan={seriAktif}
        seriesListBulanan={seriAktif}
      />
    </div>
  );
}