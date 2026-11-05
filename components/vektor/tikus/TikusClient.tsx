'use client';
// components/vektor/tikus/TikusClient.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NAMA_WILAYAH, OPSI_WILAYAH } from '@/lib/vektor/umum';
import { SPESIES } from '@/lib/vektor/tikus/config';
import Dialog from '@/components/vektor/diare/Dialog';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih } from '@/components/vektor/diare/umum';
import FormSurveiTikus from './FormSurveiTikus';
import FormLab from './FormLab';
import UnggahTikus from './UnggahTikus';
import type { BarisLab, BarisSurvei } from './tipe';

type Tampilan = 'survei' | 'lab';
type Dialogan =
  | null
  | { tipe: 'survei'; baris: BarisSurvei | null }
  | { tipe: 'lab'; baris: BarisLab | null }
  | { tipe: 'unggah' };

const UKURAN = 100;
const FILTER_AWAL = { dari: '', sampai: '', wilayah: '', spesies: '', positif: false };
const aksiKecil =
  'rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';
const tampil = (v: number | null | undefined) => (v == null ? '-' : fmtAngka(v));

function Hasil({ v }: { v: string | null }) {
  if (!v) return <span className="text-slate-400">-</span>;
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${v === 'Positif' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
      {v}
    </span>
  );
}

export default function TikusClient() {
  const [tampilan, setTampilan] = useState<Tampilan>('survei');
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [surveiRows, setSurveiRows] = useState<BarisSurvei[]>([]);
  const [labRows, setLabRows] = useState<BarisLab[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [adaLagi, setAdaLagi] = useState(false);
  const [dialog, setDialog] = useState<Dialogan>(null);
  const [info, setInfo] = useState<string | null>(null);

  const muat = useCallback(
    async (mulai: number) => {
      setMemuat(true);
      setGalat(null);
      try {
        const sp = new URLSearchParams({ limit: String(UKURAN), offset: String(mulai) });
        if (filter.dari) sp.set('dari', filter.dari);
        if (filter.sampai) sp.set('sampai', filter.sampai);
        if (filter.wilayah) sp.set('wilayah', filter.wilayah);
        if (tampilan === 'lab') {
          if (filter.spesies) sp.set('spesies', filter.spesies);
          if (filter.positif) sp.set('positif', '1');
        }
        const res = await fetch(`${tampilan === 'lab' ? '/api/vektor/tikus/lab' : '/api/vektor/tikus'}?${sp}`);
        const j = await res.json();
        if (!res.ok) return setGalat(j.error ?? 'Data gagal dimuat');
        if (tampilan === 'lab') setLabRows((lama) => (mulai === 0 ? j.data : [...lama, ...j.data]));
        else setSurveiRows((lama) => (mulai === 0 ? j.data : [...lama, ...j.data]));
        setAdaLagi(j.data.length === UKURAN);
      } catch {
        setGalat('Tidak bisa terhubung ke server');
      } finally {
        setMemuat(false);
      }
    },
    [tampilan, filter]
  );

  useEffect(() => {
    muat(0);
  }, [muat]);

  const lokasiSaran = useMemo(() => Array.from(new Set(labRows.map((r) => r.lokasi_pemasangan))).sort(), [labRows]);
  const jumlah = tampilan === 'lab' ? labRows.length : surveiRows.length;

  function selesai(pesan: string) {
    setDialog(null);
    setInfo(pesan);
    muat(0);
  }

  async function hapusSurvei(b: BarisSurvei) {
    const peringatan = b.lab_lama ? ' Catatan lab lama pada baris ini (jumlah diuji dan hasil) juga akan hilang.' : '';
    if (!window.confirm(`Hapus survei ${fmtTgl(b.tgl_survei)} di ${NAMA_WILAYAH[b.kode_wilker] ?? b.kode_wilker}?${peringatan}`)) return;
    const res = await fetch(`/api/vektor/tikus?id=${b.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(j.error ?? 'Gagal menghapus');
    else {
      setInfo('Survei dihapus');
      muat(0);
    }
  }

  async function hapusLab(b: BarisLab) {
    if (!window.confirm(`Hapus hasil lab ${b.nama_tikus} tanggal ${fmtTgl(b.tgl_periksa)} di ${b.lokasi_pemasangan}?`)) return;
    const res = await fetch(`/api/vektor/tikus/lab?id=${b.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(j.error ?? 'Gagal menghapus');
    else {
      setInfo('Hasil lab dihapus');
      muat(0);
    }
  }

  const tabClass = (aktif: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
      aktif ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Input Data Vektor Tikus</h1>
          <div className="mt-2 inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Tampilan data">
            <button aria-pressed={tampilan === 'survei'} onClick={() => setTampilan('survei')} className={tabClass(tampilan === 'survei')}>
              Survei
            </button>
            <button aria-pressed={tampilan === 'lab'} onClick={() => setTampilan('lab')} className={tabClass(tampilan === 'lab')}>
              Hasil Lab
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog({ tipe: 'survei', baris: null })} className={gayaTombol}>Tambah Survei</button>
          <button onClick={() => setDialog({ tipe: 'lab', baris: null })} className={gayaTombol}>Tambah Hasil Lab</button>
          <button onClick={() => setDialog({ tipe: 'unggah' })} className={gayaTombolPutih}>Unggah Excel</button>
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
            {OPSI_WILAYAH.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        {tampilan === 'lab' ? (
          <>
            <label className="text-xs text-slate-700">
              <span className="mb-1 block">Nama tikus</span>
              <select className={gayaInput} value={filter.spesies} onChange={(e) => setFilter({ ...filter, spesies: e.target.value })}>
                <option value="">Semua</option>
                {SPESIES.map((s) => <option key={s.kode} value={s.kode}>{s.kode}</option>)}
              </select>
            </label>
            <div className="flex items-end justify-between gap-2">
              <label className="flex items-center gap-2 pb-2 text-xs text-slate-700">
                <input type="checkbox" checked={filter.positif} onChange={(e) => setFilter({ ...filter, positif: e.target.checked })} />
                Ada hasil positif
              </label>
              <button onClick={() => setFilter(FILTER_AWAL)} className="pb-2 text-xs text-slate-600 underline hover:text-slate-900">Atur ulang</button>
            </div>
          </>
        ) : (
          <div className="flex items-end lg:col-span-2">
            <button onClick={() => setFilter(FILTER_AWAL)} className="pb-2 text-xs text-slate-600 underline hover:text-slate-900">Atur ulang</button>
          </div>
        )}
      </section>

      {info && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
      {galat && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{galat}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {tampilan === 'survei' ? (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Wilayah</th>
                <th className="px-3 py-2 text-right">Dipasang</th>
                <th className="px-3 py-2 text-right">RT</th>
                <th className="px-3 py-2 text-right">RN</th>
                <th className="px-3 py-2 text-right">MM</th>
                <th className="px-3 py-2 text-right">Lainnya</th>
                <th className="px-3 py-2 text-right">Tertangkap</th>
                <th className="px-3 py-2 text-right">Success trap (%)</th>
                <th className="px-3 py-2 text-right">Pinjal</th>
                <th className="px-3 py-2 text-right">Indeks pinjal</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {surveiRows.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2">
                    {fmtTgl(b.tgl_survei)}
                    {b.lab_lama && <span className="block text-xs text-slate-500">ada catatan lab lama</span>}
                  </td>
                  <td className="px-3 py-2">{NAMA_WILAYAH[b.kode_wilker] ?? b.kode_wilker}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_trap_dipasang)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.rt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.rn)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.mm)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jenis_lainnya)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_trap_tertangkap)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.tsi)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.jml_pinjal_ditemukan)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tampil(b.index_pinjal)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button onClick={() => setDialog({ tipe: 'survei', baris: b })} className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Edit</button>
                    <button onClick={() => hapusSurvei(b)} className={`${aksiKecil} text-rose-700 hover:bg-rose-50`}>Hapus</button>
                  </td>
                </tr>
              ))}
              {!surveiRows.length && !memuat && (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-500">Belum ada data untuk filter ini.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Tanggal periksa</th>
                <th className="px-3 py-2">Wilayah</th>
                <th className="px-3 py-2">Nama tikus</th>
                <th className="px-3 py-2">Lokasi pemasangan</th>
                <th className="px-3 py-2">Kode sampel</th>
                <th className="px-3 py-2">Leptospira</th>
                <th className="px-3 py-2">Pes</th>
                <th className="px-3 py-2">Hantavirus</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {labRows.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2">{fmtTgl(b.tgl_periksa)}</td>
                  <td className="px-3 py-2">{NAMA_WILAYAH[b.kode_wilker] ?? b.kode_wilker}</td>
                  <td className="px-3 py-2">{b.nama_tikus}</td>
                  <td className="px-3 py-2">{b.lokasi_pemasangan}</td>
                  <td className="px-3 py-2">{b.kode_sampel ?? <span className="text-slate-400">-</span>}</td>
                  <td className="px-3 py-2"><Hasil v={b.hasil_leptospira} /></td>
                  <td className="px-3 py-2"><Hasil v={b.hasil_pes} /></td>
                  <td className="px-3 py-2"><Hasil v={b.hasil_hantavirus} /></td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button onClick={() => setDialog({ tipe: 'lab', baris: b })} className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Edit</button>
                    <button onClick={() => hapusLab(b)} className={`${aksiKecil} text-rose-700 hover:bg-rose-50`}>Hapus</button>
                  </td>
                </tr>
              ))}
              {!labRows.length && !memuat && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">Belum ada data untuk filter ini.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span aria-live="polite">{memuat ? 'Memuat...' : `${jumlah} baris ditampilkan`}</span>
        {adaLagi && !memuat && <button onClick={() => muat(jumlah)} className={gayaTombolPutih}>Muat lebih banyak</button>}
      </div>

      <Dialog
        buka={dialog?.tipe === 'survei'}
        judul={dialog?.tipe === 'survei' && dialog.baris ? 'Ubah survei tikus' : 'Tambah survei tikus'}
        onTutup={() => setDialog(null)}
      >
        {dialog?.tipe === 'survei' && (
          <FormSurveiTikus baris={dialog.baris} onSelesai={selesai} onBatal={() => setDialog(null)} />
        )}
      </Dialog>

      <Dialog
        buka={dialog?.tipe === 'lab'}
        judul={dialog?.tipe === 'lab' && dialog.baris ? 'Ubah hasil lab' : 'Tambah hasil lab tikus'}
        onTutup={() => setDialog(null)}
      >
        {dialog?.tipe === 'lab' && (
          <FormLab baris={dialog.baris} lokasiSaran={lokasiSaran} onSelesai={selesai}
            onTersimpan={() => { if (tampilan === 'lab') muat(0); }} onBatal={() => setDialog(null)} />
        )}
      </Dialog>

      <Dialog buka={dialog?.tipe === 'unggah'} judul="Unggah Excel vektor tikus" onTutup={() => setDialog(null)}>
        {dialog?.tipe === 'unggah' && (
          <UnggahTikus modeAwal={tampilan} onData={() => muat(0)} onTutup={() => setDialog(null)} />
        )}
      </Dialog>
    </main>
  );
}