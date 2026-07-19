'use client';
import { useState } from 'react';
import PanelTrenPeriode from '@/components/vektor/PanelTrenPeriode';

type SeriKonfig = { key: string; label: string; warna: string; default?: boolean };

export default function PanelTrenDiareLingkungan({
  judulBulanan,
  dataMingguan,
  dataBulanan,
  metrikUtama,
  seriTambahan,
}: {
  judulBulanan: string;
  dataMingguan: Record<string, unknown>[];
  dataBulanan: Record<string, unknown>[];
  metrikUtama: SeriKonfig;
  seriTambahan: SeriKonfig[];
}) {
  const [aktif, setAktif] = useState<Set<string>>(
    new Set(seriTambahan.filter((s) => s.default).map((s) => s.key)),
  );

  const toggle = (key: string) =>
    setAktif((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const seriAktif = [metrikUtama, ...seriTambahan.filter((s) => aktif.has(s.key))];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs">
        {seriTambahan.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={aktif.has(s.key)}
              onChange={() => toggle(s.key)}
              style={{ accentColor: s.warna }}
            />
            <span style={{ color: s.warna }}>{s.label}</span>
          </label>
        ))}
      </div>

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