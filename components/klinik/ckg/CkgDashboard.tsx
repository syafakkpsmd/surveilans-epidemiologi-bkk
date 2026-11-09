'use client';
// components/klinik/ckg/CkgDashboard.tsx
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { OpsiWilayahCkg } from '@/lib/klinik/ckg/config';
import FilterTahun from '@/components/FilterTahun';

type Item = { label: string; n: number };
type Seri = { periode: string; n: number };
type Data = {
  ringkas: { total: number; pria: number; wanita: number; perokok: number; hipertensi: number; gulaTinggi: number; obesitas: number };
  jenisKelamin: Item[];
  umur: Item[];
  merokok: Item[];
  mingguan: Seri[];
  bulanan: Seri[];
};

const tglLokal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Batas akhir default: hari ini bila tahun berjalan, selain itu 31 Desember
const akhirDefault = (tahun: number) => {
  const sekarang = new Date();
  return tahun === sekarang.getFullYear() ? tglLokal(sekarang) : `${tahun}-12-31`;
};

const WARNA = ['#0f766e', '#d97706', '#4f46e5', '#be123c'];
const GARIS = '#0f766e';

const input =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

const labelMinggu = (p: string) =>
  new Date(p + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const labelBulan = (p: string) =>
  new Date(p + '-01T00:00:00Z').toLocaleDateString('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' });

function Kartu({ judul, nilai, total }: { judul: string; nilai: number; total?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{judul}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{nilai.toLocaleString('id-ID')}</p>
      {total != null && total > 0 && (
        <p className="text-xs text-slate-500">{((nilai / total) * 100).toFixed(1)}% dari total</p>
      )}
    </div>
  );
}

function Donut({ judul, data }: { judul: string; data: Item[] }) {
  const ada = data.some((d) => d.n > 0);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium">{judul}</h3>
      <div className="h-56">
        {ada ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="n" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center text-sm text-slate-500">Belum ada data pada rentang ini</p>
        )}
      </div>
    </section>
  );
}

export default function CkgDashboard({ opsiWilayah, tahun }: { opsiWilayah: OpsiWilayahCkg[]; tahun: number }) {
  const [dari, setDari] = useState(() => `${tahun}-01-01`);
  const [sampai, setSampai] = useState(() => akhirDefault(tahun));
  const [wilayah, setWilayah] = useState('');
  const [mode, setMode] = useState<'mingguan' | 'bulanan'>('mingguan');
  const [data, setData] = useState<Data | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  // Reset rentang ketika tahun berubah dari FilterTahun
  useEffect(() => {
    setDari(`${tahun}-01-01`);
    setSampai(akhirDefault(tahun));
  }, [tahun]);

  // Fetch data berdasarkan rentang tanggal dan wilayah
  useEffect(() => {
    const ac = new AbortController();
    setMemuat(true);
    setGalat(null);
    const q = new URLSearchParams({ dari, sampai });
    if (wilayah) q.set('wilayah', wilayah);
    
    fetch(`/api/ckg/dashboard?${q}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Gagal memuat data');
        return r.json();
      })
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setGalat(e.message))
      .finally(() => !ac.signal.aborted && setMemuat(false));
      
    return () => ac.abort();
  }, [dari, sampai, wilayah]);

  const r = data?.ringkas;
  const tombol = (m: 'mingguan' | 'bulanan', teks: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
        mode === m ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {teks}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="pb-2">
          <FilterTahun maju={0} />
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Dari</span>
          <input
            type="date"
            className={input}
            value={dari}
            min={`${tahun}-01-01`}
            max={sampai}
            onChange={(e) => setDari(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Sampai</span>
          <input
            type="date"
            className={input}
            value={sampai}
            min={dari}
            max={`${tahun}-12-31`}
            onChange={(e) => setSampai(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select className={input} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
            <option value="">Semua wilayah</option>
            {opsiWilayah.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        {memuat && <p className="pb-2 text-sm text-slate-500" role="status">Memuat...</p>}
      </div>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      {data && r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kartu judul="Total pemeriksaan" nilai={r.total} />
            <Kartu judul="Perokok" nilai={r.perokok} total={r.total} />
            <Kartu judul="Tekanan darah tinggi" nilai={r.hipertensi} total={r.total} />
            <Kartu judul="Gula darah tinggi" nilai={r.gulaTinggi} total={r.total} />
            <Kartu judul="Obesitas" nilai={r.obesitas} total={r.total} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Donut judul="Jenis kelamin" data={data.jenisKelamin} />
            <Donut judul="Kelompok umur" data={data.umur} />
            <Donut judul="Status merokok" data={data.merokok} />
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Jumlah pemeriksaan per {mode === 'mingguan' ? 'minggu' : 'bulan'}</h3>
              <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                {tombol('mingguan', 'Mingguan')}
                {tombol('bulanan', 'Bulanan')}
              </div>
            </div>
            <div className="h-72">
              {(mode === 'mingguan' ? data.mingguan : data.bulanan).length === 0 ? (
                <p className="grid h-full place-items-center text-sm text-slate-500">Belum ada data pada rentang ini</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {mode === 'mingguan' ? (
                    <LineChart data={data.mingguan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="periode" tickFormatter={labelMinggu} fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip labelFormatter={(p) => `Minggu mulai ${labelMinggu(String(p))}`} formatter={(v) => [v, 'Pemeriksaan']} />
                      <Line type="monotone" dataKey="n" stroke={GARIS} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={data.bulanan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="periode" tickFormatter={labelBulan} fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip labelFormatter={(p) => labelBulan(String(p))} formatter={(v) => [v, 'Pemeriksaan']} />
                      <Bar dataKey="n" fill={GARIS} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}