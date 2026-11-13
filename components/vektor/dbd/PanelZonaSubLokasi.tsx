'use client';

// Rincian survei DBD per zona dan sub lokasi untuk halaman Aedes. Semua indeks dihitung dari TOTAL rumah dan
// container (lib/db/queries/queriesDbdZona.ts), bukan rata-rata indeks per survei.
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AMBANG_ABJ, hitungIndeks, type Zona } from '@/lib/vektor/dbd/config';
import type { BarisSubLokasi, TitikZonaBulan } from '@/lib/db/queries/queriesDbdZona';

const AMBANG_HI = 1;
const WARNA: Record<Zona, string> = { Perimeter: '#0F4C5C', Buffer: '#2E7D32' };
const KETERANGAN_ZONA: Record<Zona, string> = { Perimeter: 'Area pelabuhan/bandara', Buffer: 'Permukiman sekitar' };
const fmt = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
type Urut = 'sub' | 'rumah' | 'hi' | 'abj';

function jumlahkan(baris: BarisSubLokasi[]) {
  const t = baris.reduce(
    (s, b) => ({ survei: s.survei + b.survei, rumah: s.rumah + b.rumah, rumahPositif: s.rumahPositif + b.rumahPositif, container: s.container + b.container, containerPositif: s.containerPositif + b.containerPositif }),
    { survei: 0, rumah: 0, rumahPositif: 0, container: 0, containerPositif: 0 },
  );
  return t.rumah > 0 ? { ...t, ...hitungIndeks(t.rumah, t.rumahPositif, t.container, t.containerPositif) } : null;
}

export default function PanelZonaSubLokasi({ baris, tren, labelPeriode, labelWilayah }: {
  baris: BarisSubLokasi[]; tren: TitikZonaBulan[]; labelPeriode: string; labelWilayah: string;
}) {
  const [tab, setTab] = useState<'Semua' | Zona>('Semua');
  const [urut, setUrut] = useState<{ k: Urut; arah: 1 | -1 }>({ k: 'hi', arah: -1 });

  const ringkasan = useMemo(() => ({
    Perimeter: jumlahkan(baris.filter((b) => b.zona === 'Perimeter')),
    Buffer: jumlahkan(baris.filter((b) => b.zona === 'Buffer')),
  }), [baris]);

  const tampil = useMemo(() => {
    const pengurut = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });
    return baris
      .filter((b) => tab === 'Semua' || b.zona === tab)
      .sort((a, b) => {
        const angka = (r: BarisSubLokasi) => (urut.k === 'hi' ? r.hi : urut.k === 'abj' ? r.abj : r.rumah);
        const hasil = urut.k === 'sub' ? pengurut.compare(a.subLokasi ?? '', b.subLokasi ?? '') : angka(a) - angka(b);
        return hasil * urut.arah || pengurut.compare(a.zona, b.zona);
      });
  }, [baris, tab, urut]);

  const maksHi = Math.max(AMBANG_HI * 2, ...tampil.map((b) => b.hi));
  const ubahUrut = (k: Urut) => setUrut((u) => ({ k, arah: u.k === k ? (u.arah === 1 ? -1 : 1) : k === 'sub' ? 1 : -1 }));
  const panah = (k: Urut) => (urut.k === k ? (urut.arah === 1 ? ' ▲' : ' ▼') : '');

  if (!baris.length) {
    return (
      <section className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
        Belum ada survei per zona untuk filter dan periode ini.
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Perbandingan Zona dan Rincian per Sub Lokasi</h2>
        <p className="text-xs text-gray-500">
          {labelWilayah} · {labelPeriode}. HI, CI, BI, dan ABJ dihitung dari total rumah/container yang diperiksa, bukan rata-rata per survei.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(['Perimeter', 'Buffer'] as const).map((z) => {
          const r = ringkasan[z];
          return (
            <div key={z} className="rounded-xl border border-gray-200 p-3" style={{ borderLeft: `4px solid ${WARNA[z]}` }}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold" style={{ color: WARNA[z] }}>{z}</h3>
                <span className="text-[11px] text-gray-500">{KETERANGAN_ZONA[z]}</span>
              </div>
              {r ? (
                <>
                  <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <div><dt className="text-[11px] text-gray-500">HI</dt><dd className={`text-lg font-bold ${r.hi > AMBANG_HI ? 'text-rose-700' : 'text-emerald-700'}`}>{fmt(r.hi)}%</dd></div>
                    <div><dt className="text-[11px] text-gray-500">ABJ</dt><dd className={`text-lg font-bold ${r.abj < AMBANG_ABJ ? 'text-rose-700' : 'text-emerald-700'}`}>{fmt(r.abj)}%</dd></div>
                    <div><dt className="text-[11px] text-gray-500">CI</dt><dd className="text-lg font-bold text-gray-800">{fmt(r.ci)}%</dd></div>
                    <div><dt className="text-[11px] text-gray-500">BI</dt><dd className="text-lg font-bold text-gray-800">{fmt(r.bi)}</dd></div>
                  </dl>
                  <p className="mt-2 text-[11px] text-gray-500">{fmt(r.survei)} survei · {fmt(r.rumahPositif)} dari {fmt(r.rumah)} rumah positif jentik</p>
                </>
              ) : (
                <p className="mt-3 text-xs text-gray-400">Tidak ada survei {z} pada filter ini.</p>
              )}
            </div>
          );
        })}
      </div>

      {tren.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">HI per bulan: Perimeter vs Buffer</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tren} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={AMBANG_HI} stroke="#B71C1C" strokeDasharray="5 4" label={{ value: `Ambang HI ${AMBANG_HI}%`, position: 'insideTopRight', fontSize: 11, fill: '#B71C1C' }} />
                <Line type="monotone" dataKey="perimeter" name="Perimeter" stroke={WARNA.Perimeter} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="buffer" name="Buffer" stroke={WARNA.Buffer} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rincian per sub lokasi</h3>
          <div role="tablist" className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs">
            {(['Semua', 'Perimeter', 'Buffer'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${tab === t ? 'bg-white text-[#0F4C5C] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <th className="px-2 py-2 font-semibold">Zona</th>
                <th className="px-2 py-2 font-semibold"><button type="button" onClick={() => ubahUrut('sub')}>Sub lokasi{panah('sub')}</button></th>
                <th className="px-2 py-2 text-right font-semibold">Survei</th>
                <th className="px-2 py-2 text-right font-semibold"><button type="button" onClick={() => ubahUrut('rumah')}>Rumah (positif/periksa){panah('rumah')}</button></th>
                <th className="px-2 py-2 text-right font-semibold">Container (positif/periksa)</th>
                <th className="px-2 py-2 font-semibold"><button type="button" onClick={() => ubahUrut('hi')}>HI %{panah('hi')}</button></th>
                <th className="px-2 py-2 text-right font-semibold">CI %</th>
                <th className="px-2 py-2 text-right font-semibold">BI</th>
                <th className="px-2 py-2 text-right font-semibold"><button type="button" onClick={() => ubahUrut('abj')}>ABJ %{panah('abj')}</button></th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((b) => (
                <tr key={`${b.zona}|${b.subLokasi ?? ''}`} className="border-b border-gray-100">
                  <td className="whitespace-nowrap px-2 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${b.zona === 'Perimeter' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>{b.zona}</span>
                  </td>
                  <td className="px-2 py-2 font-medium text-[#0F2A38]">{b.subLokasi ?? <span className="font-normal text-gray-400">(Tanpa sub lokasi)</span>}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(b.survei)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{fmt(b.rumahPositif)} / {fmt(b.rumah)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{fmt(b.containerPositif)} / {fmt(b.container)}</td>
                  <td className="min-w-32 px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (b.hi / maksHi) * 100)}%`, background: b.hi > AMBANG_HI ? '#C62828' : '#2E7D32' }} />
                      </div>
                      <span className={`w-12 text-right tabular-nums ${b.hi > AMBANG_HI ? 'font-semibold text-rose-700' : ''}`}>{fmt(b.hi)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(b.ci)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(b.bi)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${b.abj < AMBANG_ABJ ? 'font-semibold text-rose-700' : ''}`}>{fmt(b.abj)}</td>
                </tr>
              ))}
              {!tampil.length && <tr><td colSpan={9} className="px-2 py-6 text-center text-gray-400">Tidak ada data untuk zona ini.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">Merah = HI di atas {AMBANG_HI}% atau ABJ di bawah {AMBANG_ABJ}%. Klik judul kolom untuk mengurutkan.</p>
      </div>
    </section>
  );
}