'use client';
import { useState } from 'react';
import TrenChartMingguan from '@/components/vektor/TrenChartMingguan';

type SeriKonfig = { key: string; label: string; warna: string; default?: boolean };

export default function GrafikTrenMultiVariabel({
  data,
  metrikUtama, // { key, label, warna } — fly_index atau kepadatan_kecoa, selalu tampil
  seriTambahan, // suhu, cuaca, kelembaban, curah hujan — toggle via checkbox
}: {
  data: any[];
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

  const seriesList = [
    { key: metrikUtama.key, label: metrikUtama.label, warna: metrikUtama.warna },
    ...seriTambahan.filter((s) => aktif.has(s.key)),
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs">
        {seriTambahan.map((s) => (
          <label key={s.key} className="flex items-center gap-1 cursor-pointer">
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
      <TrenChartMingguan data={data} seriesList={seriesList} />
    </div>
  );
}