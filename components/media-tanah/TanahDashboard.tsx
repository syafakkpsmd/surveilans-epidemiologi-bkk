'use client';
// components/media-tanah/TanahDashboard.tsx
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { OPSI_WILAYAH } from '@/lib/media-tanah/config';

type Item = { label: string; n: number };
type Seri = { periode: string; n: number };
type Data = {
  ringkas: { total: number; memenuhi: number; tidakMemenuhi: number; perluLab: number; pelabuhan: number; sampelLab: number };
  kesimpulan: Item[];
  temuanB: Item[];
  temuanD: Item[];
  temuanE: Item[];
  mingguan: Seri[];
  bulanan: Seri[];
};

const WARNA_KES = ['#0f766e', '#be123c', '#d97706']; // memenuhi, tidak memenuhi, perlu lab
const TEAL = '#0f766e';
const ROSE = '#be123c';

const input =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

const tglLokal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const labelMinggu = (p: string) =>
  new Date(p + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const labelBulan = (p: string) =>
  new Date(p + '-01T00:00:00Z').toLocaleDateString('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' });

// Kartu Ringkasan Interaktif dengan variasi warna
function Kartu({ 
  judul, 
  nilai, 
  total, 
  variant = 'default' 
}: { 
  judul: string; 
  nilai: number; 
  total?: number;
  variant?: 'default' | 'emerald' | 'rose' | 'amber' | 'sky' | 'teal';
}) {
  const styles = {
    default: 'border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-slate-300 text-slate-800',
    emerald: 'border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white hover:border-emerald-300 text-emerald-900',
    rose: 'border-rose-100 bg-gradient-to-br from-rose-50/60 to-white hover:border-rose-300 text-rose-900',
    amber: 'border-amber-100 bg-gradient-to-br from-amber-50/60 to-white hover:border-amber-300 text-amber-900',
    sky: 'border-sky-100 bg-gradient-to-br from-sky-50/60 to-white hover:border-sky-300 text-sky-900',
    teal: 'border-teal-100 bg-gradient-to-br from-teal-50/60 to-white hover:border-teal-300 text-teal-900',
  };

  const titleStyles = {
    default: 'text-slate-600',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    sky: 'text-sky-700',
    teal: 'text-teal-700',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${styles[variant]}`}>
      <p className={`text-xs font-medium ${titleStyles[variant]}`}>{judul}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{nilai.toLocaleString('id-ID')}</p>
      {total != null && total > 0 && (
        <p className="mt-1 text-xs opacity-75">{((nilai / total) * 100).toFixed(1)}% dari total</p>
      )}
    </div>
  );
}

function Panel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <h3 className="mb-2 text-sm font-medium">{judul}</h3>
      {children}
    </section>
  );
}

const Kosong = ({ teks }: { teks: string }) => (
  <p className="grid h-40 place-items-center text-sm text-slate-500">{teks}</p>
);

function BarH({ judul, data, kosong }: { judul: string; data: Item[]; kosong: string }) {
  const ada = data.some((d) => d.n > 0);
  return (
    <Panel judul={judul}>
      {ada ? (
        <div style={{ height: Math.max(150, data.length * 34 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="label" width={190} fontSize={12} />
              <Tooltip formatter={(v) => [v, 'Temuan']} />
              <Bar dataKey="n" fill={ROSE} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Kosong teks={kosong} />
      )}
    </Panel>
  );
}

export default function TanahDashboard() {
  const [dari, setDari] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [sampai, setSampai] = useState(() => tglLokal(new Date()));
  const [wilayah, setWilayah] = useState('');
  const [mode, setMode] = useState<'mingguan' | 'bulanan'>('mingguan');
  const [data, setData] = useState<Data | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setMemuat(true);
    setGalat(null);
    const q = new URLSearchParams({ dari, sampai });
    if (wilayah) q.set('wilayah', wilayah);
    fetch(`/api/media-tanah/dashboard?${q}`, { signal: ac.signal })
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
  const seri = data ? (mode === 'mingguan' ? data.mingguan : data.bulanan) : [];
  const tombol = (m: 'mingguan' | 'bulanan', teks: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
        mode === m ? 'bg-teal-700 text-white font-medium' : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {teks}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Filter digeser ke kanan menggunakan justify-end */}
      <div className="flex flex-wrap items-end justify-end gap-3 rounded-xl bg-white p-4 shadow-xs border border-slate-100">
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Dari</span>
          <input type="date" className={input} value={dari} max={sampai} onChange={(e) => setDari(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Sampai</span>
          <input type="date" className={input} value={sampai} min={dari} onChange={(e) => setSampai(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select className={input} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
            <option value="">Semua wilayah</option>
            {OPSI_WILAYAH.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        {memuat && <p className="pb-2 text-sm text-slate-500" role="status">Memuat...</p>}
      </div>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      {data && r && (
        <>
          {/* Kartu Ringkas dengan Warna Interaktif */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Kartu judul="Total pemeriksaan" nilai={r.total} variant="default" />
            <Kartu judul="Memenuhi" nilai={r.memenuhi} total={r.total} variant="emerald" />
            <Kartu judul="Tidak memenuhi" nilai={r.tidakMemenuhi} total={r.total} variant="rose" />
            <Kartu judul="Perlu lab lanjutan" nilai={r.perluLab} total={r.total} variant="amber" />
            <Kartu judul="Sampel lab" nilai={r.sampelLab} total={r.total} variant="sky" />
            <Kartu judul="Pelabuhan diperiksa" nilai={r.pelabuhan} variant="teal" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel judul="Kesimpulan pemeriksaan">
              <div className="h-64">
                {r.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.kesimpulan} dataKey="n" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {data.kesimpulan.map((_, i) => <Cell key={i} fill={WARNA_KES[i % WARNA_KES.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Kosong teks="Belum ada data pada rentang ini" />
                )}
              </div>
            </Panel>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs lg:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">Jumlah pemeriksaan per {mode === 'mingguan' ? 'minggu' : 'bulan'}</h3>
                <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                  {tombol('mingguan', 'Mingguan')}
                  {tombol('bulanan', 'Bulanan')}
                </div>
              </div>
              <div className="h-64">
                {seri.length === 0 ? (
                  <Kosong teks="Belum ada data pada rentang ini" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {mode === 'mingguan' ? (
                      <LineChart data={data.mingguan}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="periode" tickFormatter={labelMinggu} fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip labelFormatter={(p) => `Minggu mulai ${labelMinggu(String(p))}`} formatter={(v) => [v, 'Pemeriksaan']} />
                        <Line type="monotone" dataKey="n" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    ) : (
                      <BarChart data={data.bulanan}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="periode" tickFormatter={labelBulan} fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip labelFormatter={(p) => labelBulan(String(p))} formatter={(v) => [v, 'Pemeriksaan']} />
                        <Bar dataKey="n" fill={TEAL} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarH judul="Persyaratan tanah yang tidak terpenuhi (bagian B)" data={data.temuanB} kosong="Tidak ada persyaratan yang terlanggar pada rentang ini" />
            <BarH judul="Potensi sumber pencemaran yang ditemukan (bagian D)" data={data.temuanD} kosong="Tidak ada sumber pencemaran yang ditemukan pada rentang ini" />
          </div>
          <BarH judul="Parameter laboratorium melebihi SBMKL (bagian E)" data={data.temuanE} kosong="Tidak ada parameter laboratorium yang melebihi SBMKL pada rentang ini" />
        </>
      )}
    </div>
  );
}