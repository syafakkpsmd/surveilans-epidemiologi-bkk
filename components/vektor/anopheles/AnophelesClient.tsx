'use client';
// components/vektor/anopheles/AnophelesClient.tsx
import { useCallback, useEffect, useRef, useState } from 'react';

import { ZONA, type Tipe } from '@/lib/vektor/anopheles/config';
import Dialog from '@/components/vektor/diare/Dialog';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih } from '@/components/vektor/diare/umum';
import FormAnopheles from './FormAnopheles';
import UnggahAnopheles from './UnggahAnopheles';
import { OPSI_AWAL, type BarisAnopheles, type Opsi } from './tipe';

type Dialogan = null | 'unggah' | { tipe: Tipe; baris: BarisAnopheles | null };

const UKURAN = 100;
const FILTER_AWAL = { dari: '', sampai: '', wilayah: '', zona: '' };
const NAMA: Record<Tipe, string> = { larva: 'larva', dewasa: 'nyamuk dewasa' };
const aksiKecil =
  'rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';
const tampil = (v: number | null | undefined) => (v == null ? '-' : fmtAngka(v));
const f4 = (v: number | null | undefined) =>
  v == null ? '-' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 4 });

function Zona({ b }: { b: BarisAnopheles }) {
  return (
    <>
      {b.zona}
      {b.sub_lokasi && <span className="block text-xs text-slate-600">{b.sub_lokasi}</span>}
    </>
  );
}

export default function AnophelesClient() {
  const [tampilan, setTampilan] = useState<Tipe>('larva');
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [rows, setRows] = useState<BarisAnopheles[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [adaLagi, setAdaLagi] = useState(false);
  const [dialog, setDialog] = useState<Dialogan>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [opsi, setOpsi] = useState<Opsi>(OPSI_AWAL);
  const permintaan = useRef(0);

  const muatOpsi = useCallback(async () => {
    try {
      const res = await fetch('/api/vektor/anopheles/opsi');
      if (res.ok) setOpsi(await res.json());
    } catch {
      /* saran isian tetap kosong */
    }
  }, []);

  const muat = useCallback(
    async (mulai: number) => {
      const id = ++permintaan.current;
      setMemuat(true);
      setGalat(null);
      try {
        const sp = new URLSearchParams({ tipe: tampilan, limit: String(UKURAN), offset: String(mulai) });
        if (filter.dari) sp.set('dari', filter.dari);
        if (filter.sampai) sp.set('sampai', filter.sampai);
        if (filter.wilayah) sp.set('wilayah', filter.wilayah);
        if (filter.zona) sp.set('zona', filter.zona);
        const res = await fetch(`/api/vektor/anopheles?${sp}`);
        const j = await res.json();
        if (id !== permintaan.current) return;
        if (!res.ok) return setGalat(j.error ?? 'Data gagal dimuat');
        const data = j.data as BarisAnopheles[];
        setRows((lama) => (mulai === 0 ? data : [...lama, ...data]));
        setAdaLagi(data.length === UKURAN);
      } catch {
        if (id === permintaan.current) setGalat('Tidak bisa terhubung ke server');
      } finally {
        if (id === permintaan.current) setMemuat(false);
      }
    },
    [tampilan, filter]
  );

  useEffect(() => {
    setRows([]);
  }, [tampilan]);

  useEffect(() => {
    muat(0);
  }, [muat]);

  useEffect(() => {
    muatOpsi();
  }, [muatOpsi]);

  function selesai(pesan: string, tipe: Tipe) {
    setDialog(null);
    setInfo(pesan);
    muatOpsi();
    if (tipe !== tampilan) setTampilan(tipe); // efek di atas memuat ulang
    else muat(0);
  }

  async function hapus(b: BarisAnopheles) {
    const ok = window.confirm(
      `Hapus survei ${NAMA[tampilan]} ${fmtTgl(b.tgl_survei)} di ${wk.namaPanjangByKode[b.kode_wilker] ?? b.kode_wilker}?`
    );
    if (!ok) return;
    const res = await fetch(`/api/vektor/anopheles?id=${b.id}&tipe=${tampilan}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(j.error ?? 'Gagal menghapus');
    else {
      setInfo('Survei dihapus');
      muat(0);
    }
  }

  const tabClass = (aktif: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
      aktif ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
    }`;

  const dSurvei = dialog && dialog !== 'unggah' ? dialog : null;

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Input Data Survei Anopheles</h1>
          <div className="mt-2 inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Tampilan data">
            <button aria-pressed={tampilan === 'larva'} onClick={() => setTampilan('larva')} className={tabClass(tampilan === 'larva')}>
              Larva
            </button>
            <button aria-pressed={tampilan === 'dewasa'} onClick={() => setTampilan('dewasa')} className={tabClass(tampilan === 'dewasa')}>
              Nyamuk Dewasa
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog({ tipe: 'larva', baris: null })} className={gayaTombol}>Tambah Survei Larva</button>
          <button onClick={() => setDialog({ tipe: 'dewasa', baris: null })} className={gayaTombol}>Tambah Survei Nyamuk Dewasa</button>
          <button onClick={() => setDialog('unggah')} className={gayaTombolPutih}>Unggah Excel</button>
        </div>
      </header>

      <section aria-label="Filter" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <select className={gayaInput} value={filter.wilayah} onChange={(e) => setFilter({ ...filter, wilayah: e.target.value })}>
            <option value="">Semua</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Zona</span>
          <select className={gayaInput} value={filter.zona} onChange={(e) => setFilter({ ...filter, zona: e.target.value })}>
            <option value="">Semua</option>
            {ZONA.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={() => setFilter(FILTER_AWAL)} className="pb-2 text-xs text-slate-600 underline hover:text-slate-900">Atur ulang</button>
        </div>
      </section>

      {info && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
      {galat && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{galat}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            {tampilan === 'larva' ? (
              <tr>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Wilayah</th>
                <th className="px-3 py-2">Zona / lokasi</th>
                <th className="px-3 py-2 text-right">Cidukan</th>
                <th className="px-3 py-2 text-right">Larva</th>
                <th className="px-3 py-2 text-right">Jenis</th>
                <th className="px-3 py-2">Tempat perindukan</th>
                <th className="px-3 py-2">Fase bulan</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            ) : (
              <tr>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Wilayah</th>
                <th className="px-3 py-2">Zona / lokasi</th>
                <th className="px-3 py-2">Metode</th>
                <th className="px-3 py-2 text-right">Nyamuk</th>
                <th className="px-3 py-2 text-right">Petugas</th>
                <th className="px-3 py-2 text-right">Jam</th>
                <th className="px-3 py-2 text-right">MBR</th>
                <th className="px-3 py-2 text-right">MHD</th>
                <th className="px-3 py-2">Spesies</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((b) => (
              <tr key={b.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-2">{fmtTgl(b.tgl_survei)}</td>
                <td className="px-3 py-2">{wk.namaPanjangByKode[b.kode_wilker] ?? b.kode_wilker}</td>
                <td className="px-3 py-2"><Zona b={b} /></td>
                {tampilan === 'larva' ? (
                  <>
                    <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jumlah_cidukan)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jumlah_larva ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jumlah_jenis_larva ?? 0)}</td>
                    <td className="px-3 py-2">
                      {b.macam_tempat_perindukan ?? '-'}
                      {b.keadaan_tempat_perindukan && (
                        <span className="block text-xs text-slate-600">{b.keadaan_tempat_perindukan}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{b.fase_bulan ?? '-'}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">{b.metode_tangkap ?? '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_nyamuk)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_petugas)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_jam_tangkap)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f4(b.mbr)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f4(b.mhd)}</td>
                    <td className="px-3 py-2">{b.spesies ?? '-'}</td>
                  </>
                )}
                <td className="whitespace-nowrap px-3 py-2">
                  <button onClick={() => setDialog({ tipe: tampilan, baris: b })}
                    className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Edit</button>
                  <button onClick={() => hapus(b)} className={`${aksiKecil} text-rose-700 hover:bg-rose-50`}>Hapus</button>
                </td>
              </tr>
            ))}
            {!rows.length && !memuat && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-500">Belum ada data untuk filter ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span aria-live="polite">{memuat ? 'Memuat...' : `${rows.length} baris ditampilkan`}</span>
        {adaLagi && !memuat && <button onClick={() => muat(rows.length)} className={gayaTombolPutih}>Muat lebih banyak</button>}
      </div>

      <Dialog
        buka={!!dSurvei}
        judul={dSurvei ? `${dSurvei.baris ? 'Ubah' : 'Tambah'} survei ${NAMA[dSurvei.tipe]}` : ''}
        onTutup={() => setDialog(null)}
      >
        {dSurvei && (
          <FormAnopheles tipe={dSurvei.tipe} baris={dSurvei.baris} opsi={opsi} onSelesai={selesai}
            onBatal={() => setDialog(null)} onLokasiBerubah={() => muat(0)} />
        )}
      </Dialog>

      <Dialog buka={dialog === 'unggah'} judul="Unggah Excel survei Anopheles" onTutup={() => setDialog(null)}>
        {dialog === 'unggah' && (
          <UnggahAnopheles modeAwal={tampilan} onData={() => { muat(0); muatOpsi(); }} onTutup={() => setDialog(null)} />
        )}
      </Dialog>
    </main>
  );
}