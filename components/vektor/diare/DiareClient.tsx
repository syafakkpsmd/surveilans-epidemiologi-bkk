'use client';
// components/vektor/diare/DiareClient.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';
import Link from 'next/link';
import { JENIS, LABEL_JENIS, STATUS_TMS, type Jenis } from '@/lib/vektor/diare/config';
import Dialog from './Dialog';
import FormSurvei from './FormSurvei';
import FormTindakan from './FormTindakan';
import UnggahDiare from './UnggahDiare';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih, type Baris } from './umum';

type Dialogan =
  | null
  | { tipe: 'survei'; baris: Baris | null }
  | { tipe: 'tindakan'; baris: Baris | null }
  | { tipe: 'unggah' };

const UKURAN = 100;
const FILTER_AWAL = { dari: '', sampai: '', wilayah: '', hasil: '', tanpaTindakan: false };
const aksiKecil =
  'rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

export default function DiareClient({ jenis, wilayah }: { jenis: Jenis; wilayah: Wilayah[] }) {
  const wk = useMemo(() => buatKamus(wilayah), [wilayah]);
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [rows, setRows] = useState<Baris[]>([]);
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
        const sp = new URLSearchParams({ jenis, limit: String(UKURAN), offset: String(mulai) });
        if (filter.dari) sp.set('dari', filter.dari);
        if (filter.sampai) sp.set('sampai', filter.sampai);
        if (filter.wilayah) sp.set('wilayah', filter.wilayah);
        if (filter.hasil) sp.set('hasil', filter.hasil);
        if (filter.tanpaTindakan) sp.set('tanpa_tindakan', '1');
        const res = await fetch(`/api/vektor/diare?${sp}`);
        const j = await res.json();
        if (!res.ok) return setGalat(j.error ?? 'Data gagal dimuat');
        const data = j.data as Baris[];
        setRows((lama) => (mulai === 0 ? data : [...lama, ...data]));
        setAdaLagi(data.length === UKURAN);
      } catch {
        setGalat('Tidak bisa terhubung ke server');
      } finally {
        setMemuat(false);
      }
    },
    [jenis, filter]
  );

  useEffect(() => {
    muat(0);
  }, [muat]);

  function selesai(pesan: string) {
    setDialog(null);
    setInfo(pesan);
    muat(0);
  }

  async function hapus(b: Baris) {
    const ok = window.confirm(
      `Hapus survei ${LABEL_JENIS[jenis].toLowerCase()} ${fmtTgl(b.tgl_kegiatan)} di ${b.lokasi}? Tindakan pengendaliannya ikut terhapus.`
    );
    if (!ok) return;
    const res = await fetch(`/api/vektor/diare?id=${b.id}&jenis=${jenis}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(j.error ?? 'Gagal menghapus');
    else {
      setInfo('Survei dihapus');
      muat(0);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Input Data {LABEL_JENIS[jenis]}</h1>
          <nav aria-label="Jenis vektor diare" className="mt-1 flex gap-3 text-sm">
            {JENIS.map((j) =>
              j === jenis ? (
                <span key={j} aria-current="page" className="font-medium text-teal-800">{LABEL_JENIS[j]}</span>
              ) : (
                <Link key={j} href={`/dashboard/data/vektor/${j}`} className="text-slate-600 underline hover:text-slate-900">
                  {LABEL_JENIS[j]}
                </Link>
              )
            )}
          </nav>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog({ tipe: 'survei', baris: null })} className={gayaTombol}>Tambah Survei</button>
          <button onClick={() => setDialog({ tipe: 'tindakan', baris: null })} className={gayaTombol}>Tambah Tindakan</button>
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
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-700">
          <span className="mb-1 block">Hasil</span>
          <select className={gayaInput} value={filter.hasil} onChange={(e) => setFilter({ ...filter, hasil: e.target.value })}>
            <option value="">Semua</option>
            <option value="ms">Memenuhi syarat</option>
            <option value="tms">Tidak memenuhi syarat</option>
          </select>
        </label>
        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 pb-2 text-xs text-slate-700">
            <input type="checkbox" checked={filter.tanpaTindakan}
              onChange={(e) => setFilter({ ...filter, tanpaTindakan: e.target.checked })} />
            Belum ada tindakan
          </label>
          <button onClick={() => setFilter(FILTER_AWAL)} className="pb-2 text-xs text-slate-600 underline hover:text-slate-900">
            Atur ulang
          </button>
        </div>
      </section>

      {info && (
        <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>
      )}
      {galat && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{galat}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Wilayah</th>
              <th className="px-3 py-2">Lokasi</th>
              <th className="px-3 py-2 text-right">Nilai</th>
              <th className="px-3 py-2">Hasil</th>
              <th className="px-3 py-2">Tindakan pengendalian</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((b) => {
              const tms = b.hasil_pengamatan === STATUS_TMS;
              return (
                <tr key={b.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2">{fmtTgl(b.tgl_kegiatan)}</td>
                  <td className="px-3 py-2">{wk.namaPanjangByKode[b.kode_wilker] ?? b.kode_wilker}</td>
                  <td className="px-3 py-2">{b.lokasi}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtAngka(b.nilai)}</td>
                  <td className="px-3 py-2">
                    <span
                      aria-label={b.hasil_pengamatan}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${tms ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}
                    >
                      {tms ? 'TMS' : 'MS'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {b.tindakan_pengendalian ? (
                      <>
                        <span>{b.tindakan_pengendalian}</span>
                        {(b.insektisida_terpakai_ml != null || b.luas_area_semprot_m2 != null) && (
                          <span className="block text-xs text-slate-600">
                            {b.insektisida_terpakai_ml != null && <>{fmtAngka(b.insektisida_terpakai_ml)} ml</>}
                            {b.insektisida_terpakai_ml != null && b.luas_area_semprot_m2 != null && ' · '}
                            {b.luas_area_semprot_m2 != null && <>{fmtAngka(b.luas_area_semprot_m2)} m²</>}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {(tms || b.tindakan_pengendalian) && (
                      <button onClick={() => setDialog({ tipe: 'tindakan', baris: b })}
                        className={`${aksiKecil} text-teal-800 hover:bg-teal-50`}>
                        {b.tindakan_pengendalian ? 'Ubah tindakan' : 'Tindakan'}
                      </button>
                    )}
                    <button onClick={() => setDialog({ tipe: 'survei', baris: b })}
                      className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Edit</button>
                    <button onClick={() => hapus(b)}
                      className={`${aksiKecil} text-rose-700 hover:bg-rose-50`}>Hapus</button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && !memuat && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Belum ada data untuk filter ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span aria-live="polite">{memuat ? 'Memuat...' : `${rows.length} baris ditampilkan`}</span>
        {adaLagi && !memuat && (
          <button onClick={() => muat(rows.length)} className={gayaTombolPutih}>Muat lebih banyak</button>
        )}
      </div>

      <Dialog
        buka={dialog?.tipe === 'survei'}
        judul={dialog?.tipe === 'survei' && dialog.baris ? 'Ubah survei' : `Tambah survei ${LABEL_JENIS[jenis].toLowerCase()}`}
        onTutup={() => setDialog(null)}
      >
        {dialog?.tipe === 'survei' && (
          <FormSurvei
            wk={wk}
            jenis={jenis}
            baris={dialog.baris}
            onLokasiBerubah={() => muat(0)}
            onSelesai={selesai}
            onBatal={() => setDialog(null)}
          />
        )}
      </Dialog>

      <Dialog buka={dialog?.tipe === 'tindakan'} judul="Tindakan pengendalian" onTutup={() => setDialog(null)}>
        {dialog?.tipe === 'tindakan' && (
          <FormTindakan
            wk={wk}
            jenis={jenis}
            baris={dialog.baris}
            wilayahAwal={filter.wilayah}
            onSelesai={selesai}
            onBatal={() => setDialog(null)}
          />
        )}
      </Dialog>

      <Dialog buka={dialog?.tipe === 'unggah'} judul={`Unggah Excel ${LABEL_JENIS[jenis].toLowerCase()}`} onTutup={() => setDialog(null)}>
        {dialog?.tipe === 'unggah' && (
          <UnggahDiare jenis={jenis} onData={() => muat(0)} onTutup={() => setDialog(null)} />
        )}
      </Dialog>
    </main>
  );
}