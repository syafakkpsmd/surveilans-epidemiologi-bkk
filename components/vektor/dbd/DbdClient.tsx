'use client';
// components/vektor/dbd/DbdClient.tsx
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';

import { AMBANG_ABJ, LITER_KE_DB, ZONA } from '@/lib/vektor/dbd/config';
import Dialog from '@/components/vektor/diare/Dialog';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih } from '@/components/vektor/diare/umum';
import FormSurveiDbd from './FormSurveiDbd';
import FormPengendalianDbd from './FormPengendalianDbd';
import UnggahDbd from './UnggahDbd';
import type { BarisDbd } from './tipe';

type Dialogan =
  | null
  | 'unggah'
  | { tipe: 'survei'; baris: BarisDbd | null }
  | { tipe: 'pengendalian'; baris: BarisDbd | null };

const UKURAN = 100;
const FILTER_AWAL = { dari: '', sampai: '', wilayah: '', zona: '', subLokasi: '', belum: false };
const aksiKecil =
  'rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';
const tampil = (v: number | null | undefined) => (v == null ? '-' : fmtAngka(v));
const liter = (v: number) => fmtAngka(Math.round((v / LITER_KE_DB) * 10000) / 10000);

interface DbdClientProps {
  wilayah: Wilayah[];
}

export default function DbdClient({ wilayah }: DbdClientProps) {
  const wk = useMemo(() => buatKamus(wilayah), [wilayah]);

  const [filter, setFilter] = useState(FILTER_AWAL);
  const [rows, setRows] = useState<BarisDbd[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [adaLagi, setAdaLagi] = useState(false);
  const [dialog, setDialog] = useState<Dialogan>(null);
  const [info, setInfo] = useState<string | null>(null);
  const permintaan = useRef(0);
  const [opsiSub, setOpsiSub] = useState<string[]>([]);
  // Pilihan sub lokasi mengikuti wilayah + zona yang difilter.
  useEffect(() => {
    if (!filter.wilayah) return;
    let batal = false;
    fetch(`/api/vektor/dbd/sublokasi?wilayah=${filter.wilayah}${filter.zona ? `&zona=${filter.zona}` : ''}`)
      .then((r) => r.json())
      .then((j) => { if (!batal) setOpsiSub(j.data ?? []); })
      .catch(() => {});
    return () => { batal = true; };
  }, [filter.wilayah, filter.zona]);
  const opsiSubTampil = filter.wilayah ? opsiSub : [];

  const muat = useCallback(
    async (mulai: number) => {
      const id = ++permintaan.current;
      setMemuat(true);
      setGalat(null);
      try {
        const sp = new URLSearchParams({ limit: String(UKURAN), offset: String(mulai) });
        if (filter.dari) sp.set('dari', filter.dari);
        if (filter.sampai) sp.set('sampai', filter.sampai);
        if (filter.wilayah) sp.set('wilayah', filter.wilayah);
        if (filter.zona) sp.set('zona', filter.zona);
        if (filter.subLokasi) sp.set('sub_lokasi', filter.subLokasi);
        if (filter.belum) sp.set('belum_pengendalian', '1');
        const res = await fetch(`/api/vektor/dbd?${sp}`);
        const j = await res.json();
        if (id !== permintaan.current) return;
        if (!res.ok) return setGalat(j.error ?? 'Data gagal dimuat');
        const data = j.data as BarisDbd[];
        setRows((lama) => (mulai === 0 ? data : [...lama, ...data]));
        setAdaLagi(data.length === UKURAN);
      } catch {
        if (id === permintaan.current) setGalat('Tidak bisa terhubung ke server');
      } finally {
        if (id === permintaan.current) setMemuat(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    muat(0);
  }, [muat]);

  function selesai(pesan: string) {
    setDialog(null);
    setInfo(pesan);
    muat(0);
  }

  async function hapus(b: BarisDbd) {
    const ok = window.confirm(
      `Hapus survei ${fmtTgl(b.tgl_survei)} di ${wk.namaPanjangByKode[b.kode_wilker] ?? b.kode_wilker} (${b.zona})? ` +
        (b.ada_pengendalian ? 'Pengendaliannya ikut terhapus.' : '')
    );
    if (!ok) return;
    const res = await fetch(`/api/vektor/dbd?id=${b.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(j.error ?? 'Gagal menghapus');
    else {
      setInfo('Survei dihapus');
      muat(0);
    }
  }

  const dSurvei = dialog && dialog !== 'unggah' && dialog.tipe === 'survei' ? dialog : null;
  const dKendali = dialog && dialog !== 'unggah' && dialog.tipe === 'pengendalian' ? dialog : null;

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Input Data Survei DBD (Aedes)</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog({ tipe: 'survei', baris: null })} className={gayaTombol}>Tambah Survei</button>
          <button onClick={() => setDialog({ tipe: 'pengendalian', baris: null })} className={gayaTombol}>Tambah Pengendalian</button>
          <button onClick={() => setDialog('unggah')} className={gayaTombolPutih}>Unggah Excel</button>
        </div>
      </header>

      <section aria-label="Filter" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Dari tanggal</span>
          <input type="date" className={gayaInput} value={filter.dari} onChange={(e) => setFilter({ ...filter, dari: e.target.value })} />
        </label>
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Sampai tanggal</span>
          <input type="date" className={gayaInput} value={filter.sampai} onChange={(e) => setFilter({ ...filter, sampai: e.target.value })} />
        </label>
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Wilayah kerja</span>
          <select className={gayaInput} value={filter.wilayah} onChange={(e) => setFilter({ ...filter, wilayah: e.target.value, subLokasi: '' })}>
            <option value="">Semua</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Zona</span>
          <select className={gayaInput} value={filter.zona} onChange={(e) => setFilter({ ...filter, zona: e.target.value, subLokasi: '' })}>
            <option value="">Semua</option>
            {ZONA.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Sub lokasi</span>
          <select className={gayaInput} value={filter.subLokasi} disabled={!filter.wilayah}
            title={filter.wilayah ? undefined : 'Pilih wilayah kerja terlebih dahulu'}
            onChange={(e) => setFilter({ ...filter, subLokasi: e.target.value })}>
            <option value="">Semua</option>
            {opsiSubTampil.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 pb-2 text-xs text-slate-700">
            <input type="checkbox" checked={filter.belum} onChange={(e) => setFilter({ ...filter, belum: e.target.checked })} />
            Belum ada pengendalian
          </label>
          <button onClick={() => setFilter(FILTER_AWAL)} className="pb-2 text-xs text-slate-600 underline hover:text-slate-900">Atur ulang</button>
        </div>
      </section>

      {info && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
      {galat && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{galat}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Wilayah</th>
              <th className="px-3 py-2">Zona / sub lokasi</th>
              <th className="px-3 py-2 text-right">Rumah (positif/periksa)</th>
              <th className="px-3 py-2 text-right">Container (positif/periksa)</th>
              <th className="px-3 py-2 text-right">ABJ %</th>
              <th className="px-3 py-2 text-right">HI %</th>
              <th className="px-3 py-2 text-right">CI %</th>
              <th className="px-3 py-2 text-right">BI</th>
              <th className="px-3 py-2 text-right">Hujan (mm)</th>
              <th className="px-3 py-2">Pengendalian</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((b) => {
              const rendah = b.abj != null && b.abj < AMBANG_ABJ;
              return (
                <tr key={b.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2">{fmtTgl(b.tgl_survei)}</td>
                  <td className="px-3 py-2">{wk.namaPanjangByKode[b.kode_wilker] ?? b.kode_wilker}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${b.zona === 'Perimeter' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>{b.zona}</span>
                    {b.sub_lokasi && <span className="mt-0.5 block text-xs text-slate-700">{b.sub_lokasi}</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_positif_jentik)} / {tampil(b.jml_rumah_diperiksa)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.container_positif)} / {tampil(b.container_diperiksa)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${rendah ? 'font-medium text-rose-700' : ''}`}>
                    {tampil(b.abj)}
                    {rendah && <span className="block text-xs">di bawah target</span>}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${(b.hi ?? 0) > 1 ? 'font-medium text-rose-700' : ''}`}>{tampil(b.hi)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.ci)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.bi)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.curah_hujan_mm)}</td>
                  <td className="px-3 py-2">
                    {b.ada_pengendalian ? (
                      <>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Ya</span>
                        {b.larvasida_gram != null && b.larvasida_gram > 0 && (
                          <span className="mt-1 block text-xs text-slate-600">Larvasida {fmtAngka(b.larvasida_gram)} g</span>
                        )}
                        {((b.luas_wilayah_fogging_ha ?? 0) > 0 || (b.jml_insektisida_fogging_ml ?? 0) > 0) && (
                          <span className="block text-xs text-slate-600">
                            Fogging {tampil(b.luas_wilayah_fogging_ha)} ha
                            {b.jml_insektisida_fogging_ml != null && <> · {liter(b.jml_insektisida_fogging_ml)} L</>}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button onClick={() => setDialog({ tipe: 'pengendalian', baris: b })}
                      className={`${aksiKecil} text-teal-800 hover:bg-teal-50`}>
                      {b.ada_pengendalian ? 'Ubah pengendalian' : 'Pengendalian'}
                    </button>
                    <button onClick={() => setDialog({ tipe: 'survei', baris: b })}
                      className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Edit</button>
                    <button onClick={() => hapus(b)} className={`${aksiKecil} text-rose-700 hover:bg-rose-50`}>Hapus</button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && !memuat && (
              <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-500">Belum ada data untuk filter ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span aria-live="polite">{memuat ? 'Memuat...' : `${rows.length} baris ditampilkan`}</span>
        {adaLagi && !memuat && <button onClick={() => muat(rows.length)} className={gayaTombolPutih}>Muat lebih banyak</button>}
      </div>

      <Dialog buka={!!dSurvei} judul={dSurvei?.baris ? 'Ubah survei DBD' : 'Tambah survei DBD'} onTutup={() => setDialog(null)}>
        {dSurvei && <FormSurveiDbd baris={dSurvei.baris} wk={wk} onSelesai={selesai} onBatal={() => setDialog(null)} />}
      </Dialog>

      <Dialog buka={!!dKendali} judul="Pengendalian DBD" onTutup={() => setDialog(null)}>
        {dKendali && (
          <FormPengendalianDbd baris={dKendali.baris} wilayahAwal={filter.wilayah} wk={wk} onSelesai={selesai}
            onBatal={() => setDialog(null)} />
        )}
      </Dialog>

      <Dialog buka={dialog === 'unggah'} judul="Unggah Excel survei DBD" onTutup={() => setDialog(null)}>
        {dialog === 'unggah' && <UnggahDbd onData={() => muat(0)} onTutup={() => setDialog(null)} />}
      </Dialog>
    </main>
  );
}