'use client';

import { useEffect, useRef, useState } from 'react';

export interface OpsiWilayahMultiSelect {
  key: string;
  label: string;
  induk: string | null;
}

export default function PilihWilayahMultiSelect({
  opsi, nilai, onUbah, placeholder = 'Semua Wilayah',
}: {
  opsi: OpsiWilayahMultiSelect[];
  nilai: string[];
  onUbah: (nilaiBaru: string[]) => void;
  placeholder?: string;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function tutupJikaKlikLuar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setTerbuka(false);
    }
    document.addEventListener('mousedown', tutupJikaKlikLuar);
    return () => document.removeEventListener('mousedown', tutupJikaKlikLuar);
  }, []);

  const terkelompok = opsi.reduce<Record<string, OpsiWilayahMultiSelect[]>>((acc, o) => {
    const key = o.induk ?? '_tanpa_induk';
    (acc[key] ??= []).push(o);
    return acc;
  }, {});

  function toggle(key: string) {
    onUbah(nilai.includes(key) ? nilai.filter((k) => k !== key) : [...nilai, key]);
  }

  function toggleSemuaDalamGrup(items: OpsiWilayahMultiSelect[]) {
    const semuaKeyGrup = items.map((i) => i.key);
    const semuaSudahDipilih = semuaKeyGrup.every((k) => nilai.includes(k));
    onUbah(
      semuaSudahDipilih
        ? nilai.filter((k) => !semuaKeyGrup.includes(k))
        : [...new Set([...nilai, ...semuaKeyGrup])]
    );
  }

  const labelTampilan =
    nilai.length === 0 ? placeholder :
    nilai.length === 1 ? opsi.find((o) => o.key === nilai[0])?.label ?? '1 dipilih' :
    `${nilai.length} lokasi dipilih`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setTerbuka((t) => !t)}
        className="w-full min-w-45 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-left bg-white hover:bg-gray-50"
      >
        {labelTampilan}
      </button>

      {terbuka && (
        <div className="absolute z-20 mt-1 w-72 max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => onUbah([])}
            className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 ${nilai.length === 0 ? 'font-semibold text-green-700' : 'text-gray-700'} hover:bg-gray-50`}
          >
            Semua Wilayah
          </button>

          {Object.entries(terkelompok).map(([induk, items]) => {
            const semuaDipilih = items.every((i) => nilai.includes(i.key));
            return (
              <div key={induk} className="border-b border-gray-100 last:border-0">
                <button
                  type="button"
                  onClick={() => toggleSemuaDalamGrup(items)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${semuaDipilih ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-50'}`}
                >
                  {induk}
                </button>
                {items.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nilai.includes(item.key)}
                      onChange={() => toggle(item.key)}
                      className="h-3.5 w-3.5"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}