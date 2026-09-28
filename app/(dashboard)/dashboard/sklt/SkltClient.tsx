'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { SkltRow } from '@/lib/turso/sklt';

/* ───────────── konstanta ───────────── */
const C = {
  laik: '#0F9D8A',
  tidak: '#D64545',
  navy: '#123B5E',
  biru: '#2B7BB9',
  amber: '#E0A100',
  abu: '#94A3B8',
};
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PALET = [C.biru, C.amber, '#7C5CBF', '#E2703A', '#3FA34D', '#C2447F', C.abu];

/* ───────────── helper ───────────── */
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const fmt = (n: number) => n.toLocaleString('id-ID');

/** Minggu epidemiologi MMWR (Minggu–Sabtu, minggu 1 = minggu yang memuat 4 Januari) */
function mmwr(d: Date): { year: number; week: number } {
  const sun = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()));
  const year = new Date(sun.getTime() + 3 * 864e5).getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const w1 = new Date(Date.UTC(year, 0, 4 - jan4.getUTCDay()));
  return { year, week: Math.floor((sun.getTime() - w1.getTime()) / (7 * 864e5)) + 1 };
}
const parseTgl = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const maxMinggu = (tahun: number) => mmwr(new Date(Date.UTC(tahun, 11, 28))).week;
function mingguDari(tgl: string, tahun: number): number {
  const m = mmwr(parseTgl(tgl));
  if (m.year < tahun) return 1;
  if (m.year > tahun) return maxMinggu(tahun);
  return m.week;
}

function top(rows: SkltRow[], ambil: (r: SkltRow) => string[], n: number) {
  const map = new Map<string, { nama: string; jumlah: number }>();
  for (const r of rows) {
    for (const k of ambil(r)) {
      const kunci = k.trim().toLowerCase();
      if (!kunci) continue;
      const cur = map.get(kunci);
      if (cur) cur.jumlah++;
      else map.set(kunci, { nama: k.trim().charAt(0).toUpperCase() + k.trim().slice(1), jumlah: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, n);
}

const TIDAK_ADA_FASILITAS = new Set(['-', '--', 'tidak', 'tidak ada', 'tdk', 'tidak butuh', 'tidak membutuhkan']);

/* ───────────── komponen kecil ───────────── */
function Kartu({ judul, children, className = '' }: { judul?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {judul && <h3 className="mb-4 text-center text-sm font-semibold text-slate-700">{judul}</h3>}
      {children}
    </section>
  );
}

function Legenda({ items }: { items: { nama: string; warna: string; nilai?: number }[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.nama} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.warna }} />
          {i.nama}{i.nilai !== undefined && <b className="tabular-nums text-slate-800">{fmt(i.nilai)}</b>}
        </span>
      ))}
    </div>
  );
}

function Donut({ judul, data }: { judul: string; data: { name: string; value: number; color: string }[] }) {
  const ada = data.filter((d) => d.value > 0);
  const total = ada.reduce((s, d) => s + d.value, 0);
  return (
    <Kartu judul={judul}>
      {total === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Belum ada data</p>
      ) : (
        <>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ada} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                  {ada.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${fmt(Number(v ?? 0))} (${pct(Number(v ?? 0), total)}%)`, String(n ?? '')]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-slate-800">{fmt(total)}</span>
              <span className="text-[11px] text-slate-500">pemeriksaan</span>
            </div>
          </div>
          <Legenda items={data.map((d) => ({ nama: d.name, warna: d.color, nilai: d.value }))} />
        </>
      )}
    </Kartu>
  );
}

function DaftarBatang({ judul, data, warna }: { judul: string; data: { nama: string; jumlah: number }[]; warna: string }) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  return (
    <Kartu judul={judul}>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Belum ada data</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => (
            <li key={d.nama} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="truncate text-slate-700" title={d.nama}>{d.nama}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full" style={{ width: `${(d.jumlah / maks) * 100}%`, background: warna }} />
              </span>
              <span className="text-right font-medium tabular-nums text-slate-800">{fmt(d.jumlah)}</span>
            </li>
          ))}
        </ul>
      )}
    </Kartu>
  );
}

function Pilih({ label, value, onChange, children }: { label: string; value: string | number; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        {children}
      </select>
    </label>
  );
}

/* ───────────── bagian tren dengan rentang ───────────── */
type Titik = { label: string; Laik: number; 'Tidak Laik': number };

function BagianTren({
  judul, jenis, data, opsi, awal, akhir, onTerapkan,
}: {
  judul: string;
  jenis: 'garis' | 'batang';
  data: Titik[];
  opsi: { v: number; label: string }[];
  awal: number;
  akhir: number;
  onTerapkan: (a: number, b: number) => void;
}) {
  const [a, setA] = useState(awal);
  const [b, setB] = useState(akhir);
  const berubah = a !== awal || b !== akhir;

  return (
    <Kartu judul={judul}>
      <div className="mb-4 flex flex-wrap items-end justify-center gap-3">
        <Pilih label="Dari" value={a} onChange={(v) => setA(Number(v))}>
          {opsi.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </Pilih>
        <Pilih label="Sampai" value={b} onChange={(v) => setB(Number(v))}>
          {opsi.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </Pilih>
        <button
          type="button"
          disabled={!berubah || a > b}
          onClick={() => onTerapkan(a, b)}
          className="rounded-lg bg-[#123B5E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c48] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          Terapkan
        </button>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {jenis === 'garis' ? (
            <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="Laik" stroke={C.laik} strokeWidth={2.5} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="Tidak Laik" stroke={C.tidak} strokeWidth={2.5} dot={{ r: 2.5 }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Bar dataKey="Laik" stackId="a" fill={C.laik} />
              <Bar dataKey="Tidak Laik" stackId="a" fill={C.tidak} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <Legenda items={[{ nama: 'Laik', warna: C.laik }, { nama: 'Tidak Laik', warna: C.tidak }]} />
    </Kartu>
  );
}

/* ───────────── halaman ───────────── */
export default function SkltClient({
  rows, tahun, tahunOpsi, tahunIni, bulanIni, hariIni,
}: {
  rows: SkltRow[];
  tahun: number;
  tahunOpsi: number[];
  tahunIni: number;
  bulanIni: number;
  hariIni: string;
}) {
  const router = useRouter();
  const [fRute, setFRute] = useState('');
  const [fMaskapai, setFMaskapai] = useState('');
  const [fLaik, setFLaik] = useState('');

  const mgMaks = maxMinggu(tahun);
  const mgDefault = tahun === tahunIni ? Math.min(mgMaks, mmwr(parseTgl(hariIni)).week) : mgMaks;
  const blDefault = tahun === tahunIni ? bulanIni : 12;
  const [rgMg, setRgMg] = useState<[number, number]>([1, mgDefault]);
  const [rgBl, setRgBl] = useState<[number, number]>([1, blDefault]);

  const daftarRute = useMemo(() => [...new Set(rows.map((r) => r.rute))].sort(), [rows]);
  const daftarMaskapai = useMemo(() => [...new Set(rows.map((r) => r.maskapai))].sort(), [rows]);

  const data = useMemo(
    () => rows.filter((r) =>
      (!fRute || r.rute === fRute) && (!fMaskapai || r.maskapai === fMaskapai) && (!fLaik || r.laik === fLaik)),
    [rows, fRute, fMaskapai, fLaik],
  );

  const s = useMemo(() => {
    const total = data.length;
    const laik = data.filter((r) => r.laik === 'Laik').length;
    const tidak = data.filter((r) => r.laik === 'Tidak Laik').length;
    const kosong = total - laik - tidak;
    const umur = data.map((r) => r.umur).filter((u): u is number => u !== null && u > 0);
    const l = data.filter((r) => /^(laki|pria|l$|lk)/i.test(r.jk.trim())).length;
    const p = data.filter((r) => /^(perempuan|wanita|p$)/i.test(r.jk.trim())).length;
    const menular = data.filter((r) => r.jenisPenyakit === 'Menular').length;
    const bukan = data.filter((r) => r.jenisPenyakit === 'Bukan Menular').length;
    const kel = [
      { nama: 'Balita (0–5)', jumlah: 0 }, { nama: 'Anak (6–17)', jumlah: 0 },
      { nama: 'Dewasa (18–59)', jumlah: 0 }, { nama: 'Lansia (60+)', jumlah: 0 },
    ];
    for (const u of umur) kel[u <= 5 ? 0 : u <= 17 ? 1 : u <= 59 ? 2 : 3].jumlah++;
    return {
      total, laik, tidak, kosong,
      pendamping: data.filter((r) => r.pendamping).length,
      hamil: data.filter((r) => r.hamil).length,
      menular, bukan,
      rataUmur: umur.length ? Math.round(umur.reduce((a, b) => a + b, 0) / umur.length) : null,
      l, p, kel,
      rute: top(data, (r) => [r.rute], 8),
      maskapai: top(data, (r) => [r.maskapai], 6),
      diagnosis: top(data, (r) => (r.diagnosis ? [r.diagnosis] : []), 10),
      fasilitas: top(
        data,
        (r) => r.fasilitas.split(/[,;\n]+/).map((x) => x.trim()).filter((x) => x && !TIDAK_ADA_FASILITAS.has(x.toLowerCase())),
        8,
      ),
      tidakLaikTerbaru: data.filter((r) => r.laik === 'Tidak Laik').slice(0, 10),
    };
  }, [data]);

  const trenMingguan = useMemo<Titik[]>(() => {
    const m = new Map<number, { l: number; t: number }>();
    for (const r of data) {
      if (r.laik === 'Belum diisi') continue;
      const w = mingguDari(r.tanggal, tahun);
      const cur = m.get(w) ?? { l: 0, t: 0 };
      if (r.laik === 'Laik') cur.l++; else cur.t++;
      m.set(w, cur);
    }
    const out: Titik[] = [];
    for (let w = rgMg[0]; w <= rgMg[1]; w++) out.push({ label: `Mg ${w}`, Laik: m.get(w)?.l ?? 0, 'Tidak Laik': m.get(w)?.t ?? 0 });
    return out;
  }, [data, tahun, rgMg]);

  const trenBulanan = useMemo<Titik[]>(() => {
    const m = new Map<number, { l: number; t: number }>();
    for (const r of data) {
      if (r.laik === 'Belum diisi') continue;
      const b = Number(r.tanggal.slice(5, 7));
      const cur = m.get(b) ?? { l: 0, t: 0 };
      if (r.laik === 'Laik') cur.l++; else cur.t++;
      m.set(b, cur);
    }
    const out: Titik[] = [];
    for (let b = rgBl[0]; b <= rgBl[1]; b++) out.push({ label: BULAN[b - 1], Laik: m.get(b)?.l ?? 0, 'Tidak Laik': m.get(b)?.t ?? 0 });
    return out;
  }, [data, rgBl]);

  const opsiMinggu = Array.from({ length: mgMaks }, (_, i) => ({ v: i + 1, label: `Mg ${i + 1}` }));
  const opsiBulan = BULAN.map((b, i) => ({ v: i + 1, label: b }));
  const persenLaik = pct(s.laik, s.total);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* ── Hero ── */}
      <section className="rounded-3xl bg-[#123B5E] p-6 text-white md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="lg:w-1/3">
            <p className="text-sm text-teal-100">Pemeriksaan laik terbang · Bandara APT Pranoto · {tahun}</p>
            <p className="mt-2 text-6xl font-semibold tabular-nums">{fmt(s.total)}</p>
            <p className="mt-1 text-sm text-slate-300">calon penumpang diperiksa</p>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span><b className="text-2xl tabular-nums text-teal-300">{persenLaik}%</b> <span className="text-slate-300">dinyatakan laik terbang</span></span>
              <span className="text-slate-300">{fmt(s.tidak)} tidak laik</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-white/15" role="img" aria-label={`Laik ${persenLaik} persen`}>
              <div style={{ width: `${pct(s.laik, s.total)}%`, background: C.laik }} />
              <div style={{ width: `${pct(s.tidak, s.total)}%`, background: C.tidak }} />
            </div>
            <div className="mt-2 flex gap-5 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: C.laik }} />Laik {fmt(s.laik)}</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: C.tidak }} />Tidak Laik {fmt(s.tidak)}</span>
              {s.kosong > 0 && <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-400" />Belum diisi {fmt(s.kosong)}</span>}
            </div>
          </div>
        </div>
        <dl className="mt-7 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-4">
          {[
            ['Membutuhkan pendamping', fmt(s.pendamping)],
            ['Hamil', fmt(s.hamil)],
            ['Penyakit menular', fmt(s.menular)],
            ['Rata-rata umur', s.rataUmur !== null ? `${s.rataUmur} th` : '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-300">{k}</dt>
              <dd className="text-xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Filter ── */}
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Pilih label="Tahun" value={tahun} onChange={(v) => router.push(`?tahun=${v}`)}>
          {tahunOpsi.map((t) => <option key={t} value={t}>{t}</option>)}
        </Pilih>
        <Pilih label="Rute (tujuan)" value={fRute} onChange={setFRute}>
          <option value="">Semua rute</option>
          {daftarRute.map((r) => <option key={r} value={r}>{r}</option>)}
        </Pilih>
        <Pilih label="Maskapai" value={fMaskapai} onChange={setFMaskapai}>
          <option value="">Semua maskapai</option>
          {daftarMaskapai.map((m) => <option key={m} value={m}>{m}</option>)}
        </Pilih>
        <Pilih label="Status kelaikan" value={fLaik} onChange={setFLaik}>
          <option value="">Semua status</option>
          <option value="Laik">Laik</option>
          <option value="Tidak Laik">Tidak Laik</option>
        </Pilih>
        {(fRute || fMaskapai || fLaik) && (
          <button type="button" onClick={() => { setFRute(''); setFMaskapai(''); setFLaik(''); }}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            Atur ulang filter
          </button>
        )}
      </section>

      {rows.length === 0 ? (
        <Kartu>
          <p className="py-12 text-center text-sm text-slate-500">
            Belum ada data SKLT untuk tahun {tahun}. Jalankan <code>kirimSkltKeTurso()</code> di Apps Script, lalu muat ulang halaman.
          </p>
        </Kartu>
      ) : (
        <>
          {/* ── Donut ── */}
          <div className="grid gap-5 md:grid-cols-3">
            <Donut judul="Status Kelaikan" data={[
              { name: 'Laik', value: s.laik, color: C.laik },
              { name: 'Tidak Laik', value: s.tidak, color: C.tidak },
              { name: 'Belum diisi', value: s.kosong, color: C.abu },
            ]} />
            <Donut judul="Jenis Kelamin" data={[
              { name: 'Laki-laki', value: s.l, color: C.biru },
              { name: 'Perempuan', value: s.p, color: '#C2447F' },
            ]} />
            <Donut judul="Jenis Penyakit" data={[
              { name: 'Menular', value: s.menular, color: C.amber },
              { name: 'Bukan Menular', value: s.bukan, color: C.navy },
            ]} />
          </div>

          {/* ── Tren ── */}
          <BagianTren
            judul="Tren Mingguan Pemeriksaan (Minggu Epidemiologi)"
            jenis="garis" data={trenMingguan} opsi={opsiMinggu}
            awal={rgMg[0]} akhir={rgMg[1]} onTerapkan={(a, b) => setRgMg([a, b])}
          />
          <BagianTren
            judul="Tren Bulanan Pemeriksaan"
            jenis="batang" data={trenBulanan} opsi={opsiBulan}
            awal={rgBl[0]} akhir={rgBl[1]} onTerapkan={(a, b) => setRgBl([a, b])}
          />

          {/* ── Rincian ── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <DaftarBatang judul="Rute Tujuan Terbanyak" data={s.rute} warna={C.biru} />
            <DaftarBatang judul="Maskapai" data={s.maskapai} warna={C.navy} />
            <DaftarBatang judul="10 Diagnosis Terbanyak" data={s.diagnosis} warna={C.amber} />
            <DaftarBatang judul="Kelompok Umur" data={s.kel} warna={C.laik} />
          </div>
          {s.fasilitas.length > 0 && (
            <DaftarBatang judul="Fasilitas yang Dibutuhkan di Pesawat" data={s.fasilitas} warna="#7C5CBF" />
          )}

          {/* ── Tidak laik terbaru ── */}
          <Kartu judul="Calon Penumpang Tidak Laik Terbaru">
            {s.tidakLaikTerbaru.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada penumpang tidak laik pada filter ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-140 text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Tanggal</th>
                      <th className="py-2 pr-4 font-medium">Inisial</th>
                      <th className="py-2 pr-4 font-medium">Umur</th>
                      <th className="py-2 pr-4 font-medium">Rute</th>
                      <th className="py-2 font-medium">Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.tidakLaikTerbaru.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-4 tabular-nums text-slate-600">{r.tanggal.split('-').reverse().join('/')}</td>
                        <td className="py-2 pr-4 font-medium text-slate-800">{r.inisial}</td>
                        <td className="py-2 pr-4 tabular-nums">{r.umur ?? '—'}</td>
                        <td className="py-2 pr-4">{r.rute}</td>
                        <td className="py-2 text-slate-700">{r.diagnosis || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-center text-xs text-slate-400">Nama penumpang disamarkan menjadi inisial untuk menjaga kerahasiaan data medis.</p>
          </Kartu>
        </>
      )}
    </div>
  );
}