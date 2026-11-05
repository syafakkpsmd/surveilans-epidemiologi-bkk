'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { PITA_GT, KODE_TANPA_GT, pitaUntukGt } from '@/lib/sertifikat/gt';
import type { BarisSertifikat } from '@/lib/db/modul/sertifikatData';
import type { MetaSertifikat, JenisSertifikat } from '@/lib/sertifikat/meta';

interface Props {
  jenis: JenisSertifikat;
  meta: MetaSertifikat;
  tahun: number;
  tahunPilihan: number[];
  rows: BarisSertifikat[];
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WARNA = '#0f766e';
const WARNA_AKTIF = '#f59e0b';
const WARNA_REDUP = '#99d5cf';
const PER_HALAMAN = 15;

const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const angka = (n: number) => n.toLocaleString('id-ID');
const kodePita = (gt: number | null) => (gt == null ? KODE_TANPA_GT : pitaUntukGt(gt)?.kode ?? KODE_TANPA_GT);
const labelPita = (kode: string) =>
  kode === KODE_TANPA_GT ? 'GT belum diisi' : PITA_GT.find((p) => p.kode === kode)?.label ?? kode;

export default function SertifikatClient({ jenis, meta, tahun, tahunPilihan, rows }: Props) {
  const [wilker, setWilker] = useState('');
  const [pita, setPita] = useState('');
  const [bulan, setBulan] = useState(0); // 0 = semua
  const [cari, setCari] = useState('');
  const [metrik, setMetrik] = useState<'dokumen' | 'bayar'>('dokumen');
  const [urut, setUrut] = useState<'desc' | 'asc'>('desc');
  const [halaman, setHalaman] = useState(1);

  const daftarWilker = useMemo(() => [...new Set(rows.map((r) => r.wilker))].sort(), [rows]);

  /** Saring baris; `lewati` dipakai agar grafik kelompok tetap menampilkan semua pilihan saat dipakai sebagai filter. */
  const saring = (lewati?: 'wilker' | 'pita' | 'bulan') => {
    const q = cari.trim().toLowerCase();
    return rows.filter((r) => {
      if (lewati !== 'wilker' && wilker && r.wilker !== wilker) return false;
      if (lewati !== 'pita' && pita && kodePita(r.gt) !== pita) return false;
      if (lewati !== 'bulan' && bulan && Number(r.tgl.slice(5, 7)) !== bulan) return false;
      if (q && !`${r.nama} ${r.nomor} ${r.bendera}`.toLowerCase().includes(q)) return false;
      return true;
    });
  };

  const terfilter = useMemo(saring, [rows, wilker, pita, bulan, cari]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Ringkasan ----
  const ringkasan = useMemo(() => {
    const total = terfilter.length;
    const bayar = terfilter.reduce((s, r) => s + r.bayar, 0);
    const unik = new Set(terfilter.map((r) => r.nama.trim().toLowerCase()).filter(Boolean)).size;
    const denganGt = terfilter.filter((r) => r.gt != null && r.gt > 0);
    const rataGt = denganGt.length ? denganGt.reduce((s, r) => s + (r.gt ?? 0), 0) / denganGt.length : 0;
    const kurang = terfilter.filter((r) => (meta.adaGt && r.gt == null) || !r.nomor || !r.nama).length;
    const hari = new Date().toLocaleDateString('sv-SE');
    const batas = new Date();
    batas.setDate(batas.getDate() + 30);
    const batas30 = batas.toLocaleDateString('sv-SE');
    const lewat = terfilter.filter((r) => r.berlaku && r.berlaku < hari).length;
    const segera = terfilter.filter((r) => r.berlaku && r.berlaku >= hari && r.berlaku <= batas30).length;
    return { total, bayar, unik, rataGt, kurang, lewat, segera };
  }, [terfilter, meta.adaGt]);

  // ---- Grafik tren bulanan ----
  const dataBulan = useMemo(() => {
    const h = BULAN.map((b) => ({ nama: b, dokumen: 0, bayar: 0 }));
    for (const r of saring('bulan')) {
      const i = Number(r.tgl.slice(5, 7)) - 1;
      if (i >= 0 && i < 12) {
        h[i].dokumen += 1;
        h[i].bayar += r.bayar;
      }
    }
    return h;
  }, [rows, wilker, pita, cari]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Grafik GT ----
  const dataGt = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const r of saring('pita')) hitung.set(kodePita(r.gt), (hitung.get(kodePita(r.gt)) ?? 0) + 1);
    return [...PITA_GT.map((p) => p.kode), KODE_TANPA_GT]
      .map((kode) => ({ kode, label: labelPita(kode), jumlah: hitung.get(kode) ?? 0 }))
      .filter((d) => d.jumlah > 0 || d.kode === pita);
  }, [rows, wilker, bulan, cari, pita]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Grafik wilayah kerja ----
  const dataWilker = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const r of saring('wilker')) hitung.set(r.wilker, (hitung.get(r.wilker) ?? 0) + 1);
    return [...hitung.entries()].map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
  }, [rows, pita, bulan, cari]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Grafik pembeda: bendera (kapal) atau jenis penampungan (air) ----
  const dataPembeda = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const r of terfilter) {
      const k = (meta.adaGt ? r.bendera : r.catatan).trim() || 'Tidak diisi';
      hitung.set(k, (hitung.get(k) ?? 0) + 1);
    }
    return [...hitung.entries()]
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 8);
  }, [terfilter, meta.adaGt]);

  // ---- Tabel ----
  const tabel = useMemo(() => {
    const s = [...terfilter].sort((a, b) => (urut === 'desc' ? b.tgl.localeCompare(a.tgl) : a.tgl.localeCompare(b.tgl)));
    return s;
  }, [terfilter, urut]);
  const jumlahHalaman = Math.max(1, Math.ceil(tabel.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, jumlahHalaman);
  const barisHalaman = tabel.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const adaFilter = !!(wilker || pita || bulan || cari.trim());
  const ubah = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setHalaman(1);
  };

  function unduhCsv() {
    const kepala = ['Tanggal terbit', 'Wilayah kerja', meta.labelNama, meta.labelNomor,
      ...(meta.adaGt ? ['Bendera', 'GT', 'Kelompok GT'] : ['Jenis penampungan', 'Berlaku sampai']), 'Jumlah bayar'];
    const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const baris = tabel.map((r) => [
      r.tgl, r.wilker, r.nama, r.nomor,
      ...(meta.adaGt ? [r.bendera, r.gt ?? '', labelPita(kodePita(r.gt))] : [r.catatan, r.berlaku ?? '']),
      r.bayar,
    ]);
    const isi = '\uFEFF' + [kepala, ...baris].map((b) => b.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([isi], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jenis}-${tahun}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kontrol = 'rounded border px-3 py-1.5 text-sm';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-teal-900">
            {meta.ikon} {meta.nama}
          </h1>
          <p className="text-sm text-gray-500">
            {meta.judul}. Terbit tahun {tahun}
            {meta.adaGt ? ', dikelompokkan menurut GT (PP No. 64 Tahun 2019).' : '.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tahunPilihan.map((th) => (
            <Link key={th} href={`/dashboard/sertifikat/${jenis}?tahun=${th}`}
              className={`rounded border px-3 py-1.5 text-sm ${th === tahun ? 'bg-teal-700 text-white' : 'hover:bg-gray-50'}`}>
              {th}
            </Link>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 shadow-sm">
        <select value={wilker} onChange={(e) => ubah(setWilker)(e.target.value)} className={kontrol}>
          <option value="">Semua wilayah kerja</option>
          {daftarWilker.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        {meta.adaGt && (
          <select value={pita} onChange={(e) => ubah(setPita)(e.target.value)} className={kontrol}>
            <option value="">Semua kelompok GT</option>
            {[...PITA_GT.map((p) => p.kode), KODE_TANPA_GT].map((k) => (
              <option key={k} value={k}>{labelPita(k)}</option>
            ))}
          </select>
        )}
        <select value={bulan} onChange={(e) => ubah(setBulan)(Number(e.target.value))} className={kontrol}>
          <option value={0}>Semua bulan</option>
          {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
        </select>
        <input
          value={cari}
          onChange={(e) => ubah(setCari)(e.target.value)}
          placeholder={`Cari ${meta.labelNama.toLowerCase()}, nomor${meta.adaGt ? ', bendera' : ''}...`}
          className={`${kontrol} min-w-56 flex-1`}
        />
        {adaFilter && (
          <button
            onClick={() => { setWilker(''); setPita(''); setBulan(0); setCari(''); setHalaman(1); }}
            className="rounded border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Atur ulang filter
          </button>
        )}
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada data {meta.nama} yang terbit tahun {tahun}. Coba tahun lain, atau unggah data lewat menu Input Data.
        </div>
      )}

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kartu label="Total dokumen" nilai={angka(ringkasan.total)} utama />
        <Kartu label="Pembayaran tercatat" nilai={rupiah(ringkasan.bayar)} />
        <Kartu label={meta.adaGt ? 'Kapal unik' : 'Perusahaan unik'} nilai={angka(ringkasan.unik)} />
        {meta.adaGt ? (
          <Kartu label="Rata-rata GT" nilai={ringkasan.rataGt ? angka(Math.round(ringkasan.rataGt)) : '-'} />
        ) : (
          <Kartu label="Masa berlaku lewat / segera berakhir" nilai={`${ringkasan.lewat} / ${ringkasan.segera}`}
            catatan="berakhir dalam 30 hari" />
        )}
      </div>
      {ringkasan.kurang > 0 && (
        <p className="text-xs text-amber-700">
          {angka(ringkasan.kurang)} dokumen datanya belum lengkap ({meta.adaGt ? 'GT, ' : ''}nama, atau nomor kosong).
        </p>
      )}

      {/* Grafik */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          judul="Tren Bulanan"
          aksi={
            <>
              <Toggle aktif={metrik === 'dokumen'} onClick={() => setMetrik('dokumen')}>Dokumen</Toggle>
              <Toggle aktif={metrik === 'bayar'} onClick={() => setMetrik('bayar')}>Pembayaran</Toggle>
            </>
          }>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataBulan}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (metrik === 'bayar' ? `${Math.round(v / 1000)}rb` : String(v))} />
              <Tooltip formatter={(v) => (metrik === 'bayar' ? rupiah(Number(v)) : angka(Number(v)))}
                labelFormatter={(l) => `${l} ${tahun}`} />
              <Bar dataKey={metrik} name={metrik === 'bayar' ? 'Pembayaran' : 'Dokumen'} radius={[4, 4, 0, 0]}
                onClick={(d: any) => ubah(setBulan)(bulan === BULAN.indexOf(d?.nama) + 1 ? 0 : BULAN.indexOf(d?.nama) + 1)}
                cursor="pointer">
                {dataBulan.map((d, i) => (
                  <Cell key={d.nama} fill={bulan === 0 || bulan === i + 1 ? WARNA : WARNA_REDUP} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Petunjuk />
        </Panel>

        <Panel judul="Dokumen per Wilayah Kerja">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataWilker} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nama" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jumlah" name="Dokumen" radius={[0, 4, 4, 0]} cursor="pointer"
                onClick={(d: any) => ubah(setWilker)(wilker === d?.nama ? '' : d?.nama)}>
                {dataWilker.map((d) => (
                  <Cell key={d.nama} fill={!wilker || wilker === d.nama ? WARNA : WARNA_REDUP} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Petunjuk />
        </Panel>

        {meta.adaGt && (
          <Panel judul="Dokumen per Kelompok GT">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataGt} layout="vertical" margin={{ left: 20, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="jumlah" name="Dokumen" radius={[0, 4, 4, 0]} cursor="pointer"
                  onClick={(d: any) => ubah(setPita)(pita === d?.kode ? '' : d?.kode)}>
                  {dataGt.map((d) => (
                    <Cell key={d.kode} fill={!pita ? WARNA : pita === d.kode ? WARNA_AKTIF : WARNA_REDUP} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Petunjuk />
          </Panel>
        )}

        <Panel judul={meta.adaGt ? '8 Bendera Terbanyak' : 'Jenis Penampungan'}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataPembeda} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nama" width={130} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jumlah" name="Dokumen" fill="#134e4a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Tabel */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-teal-900">Daftar Dokumen ({angka(tabel.length)})</h2>
          <button onClick={unduhCsv} disabled={!tabel.length}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
            Unduh CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="cursor-pointer py-2 pr-3" onClick={() => setUrut(urut === 'desc' ? 'asc' : 'desc')}>
                  Terbit {urut === 'desc' ? '↓' : '↑'}
                </th>
                <th className="py-2 pr-3">Wilker</th>
                <th className="py-2 pr-3">{meta.labelNama}</th>
                <th className="py-2 pr-3">{meta.labelNomor}</th>
                {meta.adaGt ? (
                  <>
                    <th className="py-2 pr-3">Bendera</th>
                    <th className="py-2 pr-3 text-right">GT</th>
                  </>
                ) : (
                  <th className="py-2 pr-3">Berlaku sampai</th>
                )}
                <th className="py-2 text-right">Bayar</th>
              </tr>
            </thead>
            <tbody>
              {barisHalaman.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap py-2 pr-3">{r.tgl}</td>
                  <td className="py-2 pr-3">{r.wilker}</td>
                  <td className="py-2 pr-3 font-medium">{r.nama || '-'}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.nomor || '-'}</td>
                  {meta.adaGt ? (
                    <>
                      <td className="py-2 pr-3">{r.bendera || '-'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.gt == null ? '-' : angka(r.gt)}</td>
                    </>
                  ) : (
                    <td className="whitespace-nowrap py-2 pr-3">{r.berlaku ?? '-'}</td>
                  )}
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{r.bayar ? rupiah(r.bayar) : '-'}</td>
                </tr>
              ))}
              {barisHalaman.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-gray-400">Tidak ada data yang cocok dengan filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {jumlahHalaman > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Halaman {halamanAman} dari {jumlahHalaman}</span>
            <div className="flex gap-2">
              <button onClick={() => setHalaman(Math.max(1, halamanAman - 1))} disabled={halamanAman === 1}
                className="rounded border px-3 py-1 disabled:opacity-40">Sebelumnya</button>
              <button onClick={() => setHalaman(Math.min(jumlahHalaman, halamanAman + 1))} disabled={halamanAman === jumlahHalaman}
                className="rounded border px-3 py-1 disabled:opacity-40">Berikutnya</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kartu({ label, nilai, catatan, utama }: { label: string; nilai: string; catatan?: string; utama?: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${utama ? 'text-teal-700' : 'text-gray-900'}`}>{nilai}</div>
      {catatan && <div className="text-[11px] text-gray-400">{catatan}</div>}
    </div>
  );
}

function Panel({ judul, aksi, children }: { judul: string; aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-medium text-teal-900">{judul}</h2>
        {aksi && <div className="flex gap-1">{aksi}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded px-2.5 py-1 text-xs ${aktif ? 'bg-teal-700 text-white' : 'bg-gray-100'}`}>
      {children}
    </button>
  );
}

function Petunjuk() {
  return <p className="mt-1 text-center text-[11px] text-gray-400">Klik batang untuk memfilter, klik lagi untuk melepas.</p>;
}