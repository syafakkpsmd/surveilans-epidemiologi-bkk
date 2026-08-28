'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import PilihWilayahMultiSelect from './PilihWilayahMultiSelect';
import { buatOpsiWilayahIspa } from '@/lib/karhutla/constants';
import type { WilayahIspaRow } from '@/lib/supabase/queries-karhutla-server';

// PENTING: sesuaikan `id` di bawah ini dengan value parameter yang dipakai
// di dropdown FilterGrafikHarianKarhutla (mis. 'pm25' | 'pm10' | ...),
// supaya query ke /api/karhutla-tren-harian?parameter=... cocok.
const DAFTAR_PARAMETER = [
  { id: 'pm25', label: 'PM2.5', warna: '#DC2626' },
  { id: 'pm10', label: 'PM10', warna: '#EA580C' },
  { id: 'suhu', label: 'Suhu', warna: '#CA8A04' },
  { id: 'hcho', label: 'HCHO', warna: '#16A34A' },
  { id: 'tvoc', label: 'TVOC', warna: '#2563EB' },
  { id: 'kelembapan', label: 'Kelembapan', warna: '#9333EA' },
] as const;

type IdParameter = (typeof DAFTAR_PARAMETER)[number]['id'];
type BarisGabungan = { tanggal: string; [key: string]: string | number | null };

export default function GrafikMultiParameterHarianKarhutla({
  daftarWilayahIspa,
}: {
  daftarWilayahIspa: WilayahIspaRow[];
}) {
  const opsiWilayah = useMemo(() => buatOpsiWilayahIspa(daftarWilayahIspa), [daftarWilayahIspa]);

  const hariIniStr = new Date().toISOString().slice(0, 10);
  const tigaPuluhHariLalu = new Date();
  tigaPuluhHariLalu.setDate(tigaPuluhHariLalu.getDate() - 30);

  const [tanggalAwal, setTanggalAwal] = useState(tigaPuluhHariLalu.toISOString().slice(0, 10));
  const [tanggalAkhir, setTanggalAkhir] = useState(hariIniStr);
  const [wilayahKeys, setWilayahKeys] = useState<string[]>([]);
  const [parameterAktif, setParameterAktif] = useState<IdParameter[]>(
    DAFTAR_PARAMETER.map((p) => p.id)
  );

  const [data, setData] = useState<BarisGabungan[]>([]);
  const [memuat, setMemuat] = useState(false);

  useEffect(() => {
    if (tanggalAwal > tanggalAkhir || parameterAktif.length === 0) {
      setData([]);
      return;
    }

    const controller = new AbortController();
    setMemuat(true);

    async function muat() {
      try {
        const hasilPerParameter = await Promise.all(
          parameterAktif.map(async (paramId) => {
            const params = new URLSearchParams({ awal: tanggalAwal, akhir: tanggalAkhir, parameter: paramId });
            wilayahKeys.forEach((k) => params.append('wilayah', k));
            const res = await fetch(`/api/karhutla-tren-harian?${params.toString()}`, { signal: controller.signal });
            const json = await res.json();
            return { paramId, titik: (json.data ?? []) as { tanggal: string; nilai: number | null }[] };
          })
        );

        const gabungan = new Map<string, BarisGabungan>();
        for (const { paramId, titik } of hasilPerParameter) {
          for (const t of titik) {
            const baris = gabungan.get(t.tanggal) ?? { tanggal: t.tanggal };
            baris[paramId] = t.nilai;
            gabungan.set(t.tanggal, baris);
          }
        }
        setData(Array.from(gabungan.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
      } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') console.error('Gagal ambil data multi-parameter:', err);
      } finally {
        setMemuat(false);
      }
    }

    muat();
    return () => controller.abort();
  }, [tanggalAwal, tanggalAkhir, wilayahKeys, parameterAktif]);

  function toggleParameter(id: IdParameter) {
    setParameterAktif((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }
  function pilihSemua() { setParameterAktif(DAFTAR_PARAMETER.map((p) => p.id)); }
  function kosongkanSemua() { setParameterAktif([]); }

  const judul = useMemo(() => {
    if (parameterAktif.length === 0) return 'Pemantauan Harian';
    if (parameterAktif.length === DAFTAR_PARAMETER.length) return 'Pemantauan Harian — Semua Parameter';
    const label = DAFTAR_PARAMETER.filter((p) => parameterAktif.includes(p.id)).map((p) => p.label).join(', ');
    return `Pemantauan Harian — ${label}`;
  }, [parameterAktif]);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">{judul}</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Awal</label>
          <input type="date" value={tanggalAwal} onChange={(e) => setTanggalAwal(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Akhir</label>
          <input type="date" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex-1 min-w-50">
          <label className="block text-xs font-medium text-gray-600 mb-1">Wilayah</label>
          <PilihWilayahMultiSelect opsi={opsiWilayah} nilai={wilayahKeys} onUbah={setWilayahKeys} />
        </div>
      </div>

      {memuat ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Memuat grafik...</div>
      ) : parameterAktif.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Pilih minimal satu parameter untuk menampilkan grafik.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {DAFTAR_PARAMETER.filter((p) => parameterAktif.includes(p.id)).map((p) => (
                <Line key={p.id} type="monotone" dataKey={p.id} name={p.label} stroke={p.warna} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-2 mr-2">
          <button type="button" onClick={pilihSemua} className="text-xs font-medium text-teal-700 hover:underline">Pilih Semua</button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={kosongkanSemua} className="text-xs font-medium text-gray-500 hover:underline">Kosongkan</button>
        </div>
        {DAFTAR_PARAMETER.map((p) => (
          <label key={p.id} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={parameterAktif.includes(p.id)} onChange={() => toggleParameter(p.id)}
              className="rounded border-gray-300" style={{ accentColor: p.warna }} />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  );
}