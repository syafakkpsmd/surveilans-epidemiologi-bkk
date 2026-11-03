'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type OpsiKlinik = { id: string; nama_klinik: string; kategori: string | null };
type BarisChart = { jenis: string; label: string; Terbit: number; Rusak: number };

function tanggalOffset(hari: number) {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  return d.toISOString().slice(0, 10);
}

export function GrafikTerbitVsRusak({ daftarKlinikOpsi }: { daftarKlinikOpsi: OpsiKlinik[] }) {
  const [mulai, setMulai] = useState(tanggalOffset(-30));
  const [akhir, setAkhir] = useState(tanggalOffset(0));
  const [klinikTerpilih, setKlinikTerpilih] = useState<string[]>([]); // kosong = semua
  const [data, setData] = useState<BarisChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false);

  const muatData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ mulai, akhir });
    if (klinikTerpilih.length > 0) params.set('klinik', klinikTerpilih.join(','));
    try {
      const resp = await fetch('/api/klinik/stok/pemakaian?' + params.toString());
      const json = await resp.json();
      setData(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [mulai, akhir, klinikTerpilih]);

  useEffect(() => {
    muatData();
  }, [muatData]);

  function toggleKlinik(id: string) {
    setKlinikTerpilih((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const labelKlinikTerpilih =
    klinikTerpilih.length === 0 ? 'Semua Klinik & BKK' : `${klinikTerpilih.length} dipilih`;

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm font-semibold text-[#0F2A38]">Pemakaian vs Kerusakan</p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={mulai}
            onChange={(e) => setMulai(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1"
          />
          <span className="text-gray-400">s/d</span>
          <input
            type="date"
            value={akhir}
            onChange={(e) => setAkhir(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1"
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownTerbuka((v) => !v)}
              className="rounded-md border border-gray-200 px-2 py-1 bg-gray-50 hover:bg-gray-100"
            >
              {labelKlinikTerpilih} ▾
            </button>
            {dropdownTerbuka && (
              <div className="absolute right-0 z-10 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg p-2">
                <button
                  type="button"
                  onClick={() => setKlinikTerpilih([])}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 font-medium text-[#0F4C5C]"
                >
                  Semua Klinik & BKK
                </button>
                <hr className="my-1" />
                {daftarKlinikOpsi.map((k) => (
                  <label key={k.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={klinikTerpilih.includes(k.id)} onChange={() => toggleKlinik(k.id)} />
                    <span>{k.nama_klinik}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-70 items-center justify-center text-sm text-gray-400">Memuat data...</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Terbit" fill="#0F4C5C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Rusak" fill="#DC2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}