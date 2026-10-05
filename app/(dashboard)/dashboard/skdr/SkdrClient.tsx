'use client';

import { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import type { PeranUser } from '@/types/database.types';

// ==================== Konstanta ====================

const DAFTAR_PENYAKIT_SKDR: { id: number; nama: string }[] = [
  { id: 1, nama: 'Diare Akut' }, { id: 2, nama: 'Malaria' }, { id: 3, nama: 'Suspek Dengue' },
  { id: 4, nama: 'Pneomonia' }, { id: 5, nama: 'Diare Berdarah / Disentri' }, { id: 6, nama: 'Suspek Demam Tifoid' },
  { id: 7, nama: 'Sindrom Jaundice Akut' }, { id: 8, nama: 'Suspek Chikungunya' }, { id: 9, nama: 'Suspek Flu Burung pd Manusia' },
  { id: 10, nama: 'Suspek Campak' }, { id: 11, nama: 'Suspek Defteri' }, { id: 12, nama: 'Suspek Pertusis' },
  { id: 13, nama: 'Acute Flacid Paralysis (AFP)' }, { id: 14, nama: 'Gigitan Hewan Penular Rabies' }, { id: 15, nama: 'Suspek Antrax' },
  { id: 16, nama: 'Suspek Laptospirosis' }, { id: 17, nama: 'Suspek Kolera' }, { id: 18, nama: 'Penyakit yg tidak lazim' },
  { id: 19, nama: 'Suspek Meningitis/Encephalitis' }, { id: 20, nama: 'Suspek Tetanus Neonatorum' }, { id: 21, nama: 'Suspek Tetanus' },
  { id: 22, nama: 'ILI (Pykit serupa influenza)' }, { id: 23, nama: 'Suspek HFMD' }, { id: 24, nama: 'ISPA-AA' },
  { id: 25, nama: 'Suspek COVID-19' },
];

const RENTANG_BULAN_SKDR: { label: string; dari: number; sampai: number }[] = [
  { label: 'Januari', dari: 1, sampai: 4 }, { label: 'Februari', dari: 5, sampai: 8 },
  { label: 'Maret', dari: 9, sampai: 13 }, { label: 'April', dari: 14, sampai: 17 },
  { label: 'Mei', dari: 18, sampai: 21 }, { label: 'Juni', dari: 22, sampai: 26 },
  { label: 'Juli', dari: 27, sampai: 30 }, { label: 'Agustus', dari: 31, sampai: 35 },
  { label: 'September', dari: 36, sampai: 39 }, { label: 'Oktober', dari: 40, sampai: 43 },
  { label: 'November', dari: 44, sampai: 48 }, { label: 'Desember', dari: 49, sampai: 53 },
];

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n);

// ==================== Tipe ====================

type BarisSkdr = {
  jenis_penyakit_id: number | null;
  jenis_penyakit: string | null;
  jumlah_kasus: number | null;
  rata2_4minggu: number | null;
  sd_4minggu: number | null;
  ambang_atas: number | null;
  status_alert: boolean | null;
  wilayah_kerja: string | null;
};

type ModeTabel = 'semua' | 'ada' | 'alert';

interface Props {
  daftarWilayah: string[];
  dataAwal: BarisSkdr[];
  role: PeranUser | null;
  tahunEpidBerjalan: number;
  mingguEpidBerjalan: number;
}

// ==================== Komponen Utama ====================

export default function SkdrClient({ daftarWilayah, dataAwal, role, tahunEpidBerjalan, mingguEpidBerjalan }: Props) {
  const [wilayahKerja, setWilayahKerja] = useState<string | undefined>(undefined);
  const [tahun, setTahun] = useState(tahunEpidBerjalan);
  const [minggu, setMinggu] = useState(mingguEpidBerjalan);
  const [data, setData] = useState<BarisSkdr[]>(dataAwal);
  const [penyakitTerpilih, setPenyakitTerpilih] = useState<number | null>(null);
  const [mode, setMode] = useState<ModeTabel>('semua');
  const [cari, setCari] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  /** Periode yang datanya sedang tampil (berubah setelah "Terapkan" berhasil). */
  const [periodeTampil, setPeriodeTampil] = useState({ tahun: tahunEpidBerjalan, minggu: mingguEpidBerjalan });
  const [isPending, startTransition] = useTransition();

  const panelTrenRef = useRef<HTMLDivElement>(null);

  const sudahLogin = role !== null;
  const periodeKey = `${tahun}-W${minggu}`;

  function terapkanFilter() {
    startTransition(async () => {
      const supabase = createClient();
      let q = supabase
        .from('view_skdr_alert_mingguan')
        .select('*')
        .eq('tahun_epid', tahun)
        .eq('minggu_epid', minggu)
        .order('jenis_penyakit_id');
      if (wilayahKerja) q = q.eq('wilayah_kerja', wilayahKerja);
      const { data: baru, error } = await q;
      if (error) {
        setGalat(`Data minggu ${minggu} tahun ${tahun} belum bisa dimuat. Coba terapkan lagi.`);
        return;
      }
      setGalat(null);
      setData((baru ?? []) as BarisSkdr[]);
      setPeriodeTampil({ tahun, minggu });
    });
  }

  // Baris siap tampil: kalau wilayah dipilih -> filter langsung dari data yang ada;
  // kalau "Semua Wilayah Kerja" -> gabungkan lintas wilayah per jenis penyakit.
  const dataTerurut = useMemo(() => {
    let hasil: BarisSkdr[];
    if (wilayahKerja) {
      hasil = data.filter((d) => d.wilayah_kerja === wilayahKerja);
    } else {
      const map = new Map<number, BarisSkdr>();
      for (const d of data) {
        if (d.jenis_penyakit_id === null) continue;
        const ada = map.get(d.jenis_penyakit_id);
        if (ada) {
          // Kasus dan rata-rata dijumlahkan. Ambang atas yang dijumlahkan hanya perkiraan;
          // status alert gabungan = alert bila salah satu wilayah alert.
          ada.jumlah_kasus = (ada.jumlah_kasus ?? 0) + (d.jumlah_kasus ?? 0);
          ada.rata2_4minggu = (ada.rata2_4minggu ?? 0) + (d.rata2_4minggu ?? 0);
          ada.ambang_atas = (ada.ambang_atas ?? 0) + (d.ambang_atas ?? 0);
          ada.status_alert = Boolean(ada.status_alert) || Boolean(d.status_alert);
        } else {
          map.set(d.jenis_penyakit_id, { ...d, sd_4minggu: null, wilayah_kerja: null });
        }
      }
      hasil = Array.from(map.values());
    }
    return [...hasil].sort(
      (a, b) => Number(b.status_alert) - Number(a.status_alert) || (b.jumlah_kasus ?? 0) - (a.jumlah_kasus ?? 0),
    );
  }, [data, wilayahKerja]);

  // Angka untuk kartu ringkas.
  const ringkas = useMemo(() => {
    let total = 0;
    let ada = 0;
    let teratas: BarisSkdr | null = null;
    let naik: { baris: BarisSkdr; selisih: number } | null = null;
    const alert: BarisSkdr[] = [];
    for (const d of dataTerurut) {
      const kasus = d.jumlah_kasus ?? 0;
      total += kasus;
      if (kasus > 0) ada++;
      if (d.status_alert) alert.push(d);
      if (kasus > 0 && (!teratas || kasus > (teratas.jumlah_kasus ?? 0))) teratas = d;
      const selisih = kasus - (d.rata2_4minggu ?? 0);
      if (selisih > 0 && (!naik || selisih > naik.selisih)) naik = { baris: d, selisih };
    }
    return { total, ada, teratas, naik, alert };
  }, [dataTerurut]);

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return dataTerurut.filter((d) => {
      if (mode === 'alert' && !d.status_alert) return false;
      if (mode === 'ada' && (d.jumlah_kasus ?? 0) === 0) return false;
      if (kata && !(d.jenis_penyakit ?? '').toLowerCase().includes(kata)) return false;
      return true;
    });
  }, [dataTerurut, mode, cari]);

  const jumlahAlert = ringkas.alert.length;
  const labelWilayah = wilayahKerja ? wilayahKerja.replace(/_/g, ' ') : 'Semua wilayah kerja';

  function pilihPenyakit(id: number | null) {
    if (id === null) return;
    setPenyakitTerpilih(id);
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelTrenRef.current?.scrollIntoView({ behavior: kurangiGerak ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">SKDR — Sistem Kewaspadaan Dini dan Respon</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Data minggu {periodeTampil.minggu}, {periodeTampil.tahun}. {labelWilayah}.
        </p>
      </div>

      {/* ==== FILTER SNAPSHOT MINGGU ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-4 items-end justify-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Wilayah Kerja</label>
          <select
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            value={wilayahKerja ?? ''}
            onChange={(e) => setWilayahKerja(e.target.value || undefined)}
          >
            <option value="">Semua Wilayah Kerja</option>
            {daftarWilayah.map((w) => (
              <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tahun Epid</label>
          <input
            type="number"
            className="w-24 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Minggu Epid</label>
          <input
            type="number"
            min={1}
            max={53}
            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            value={minggu}
            onChange={(e) => setMinggu(Number(e.target.value))}
          />
        </div>
        <button
          onClick={terapkanFilter}
          disabled={isPending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? 'Memuat...' : 'Terapkan'}
        </button>
      </div>

      {galat && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{galat}</p>
      )}

      <div className={`space-y-6 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        {/* ==== KARTU RINGKAS ==== */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <section
            className={`col-span-2 rounded-xl border p-4 lg:col-span-1 ${
              jumlahAlert > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className={`text-sm font-medium ${jumlahAlert > 0 ? 'text-red-800' : 'text-slate-600'}`}>
                Sinyal alert minggu ini
              </h2>
              <button
                type="button"
                disabled={jumlahAlert === 0}
                aria-pressed={mode === 'alert'}
                onClick={() => setMode(mode === 'alert' ? 'semua' : 'alert')}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === 'alert'
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-red-300 bg-white text-red-700 hover:bg-red-100'
                }`}
              >
                Hanya alert
              </button>
            </div>
            <p className={`mt-2 text-4xl font-semibold tabular-nums ${jumlahAlert > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {jumlahAlert}
            </p>
            {jumlahAlert > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ringkas.alert.slice(0, 3).map((d) => (
                  <button
                    key={d.jenis_penyakit_id}
                    type="button"
                    onClick={() => pilihPenyakit(d.jenis_penyakit_id)}
                    className="rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-xs text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    {d.jenis_penyakit} ({d.jumlah_kasus ?? 0})
                  </button>
                ))}
                {jumlahAlert > 3 && (
                  <span className="px-1 py-0.5 text-xs text-red-700">dan {jumlahAlert - 3} lainnya</span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Semua penyakit masih di bawah ambang.</p>
            )}
          </section>

          <KartuRingkas
            judul="Total kasus"
            nilai={fmt(ringkas.total)}
            catatan={`${ringkas.ada} dari ${dataTerurut.length} penyakit ada kasus`}
            aktif={mode === 'ada'}
            onClick={() => setMode(mode === 'ada' ? 'semua' : 'ada')}
          />
          <KartuRingkas
            judul="Kasus terbanyak"
            nilai={ringkas.teratas ? fmt(ringkas.teratas.jumlah_kasus ?? 0) : '—'}
            catatan={
              ringkas.teratas
                ? `${ringkas.teratas.jenis_penyakit}, ${Math.round(((ringkas.teratas.jumlah_kasus ?? 0) / ringkas.total) * 100)}% dari seluruh kasus`
                : 'Belum ada kasus tercatat'
            }
            bar={ringkas.teratas ? (ringkas.teratas.jumlah_kasus ?? 0) / ringkas.total : undefined}
            onClick={ringkas.teratas ? () => pilihPenyakit(ringkas.teratas!.jenis_penyakit_id) : undefined}
          />
          <KartuRingkas
            judul="Kenaikan tertinggi"
            nilai={ringkas.naik ? `+${fmt(ringkas.naik.selisih)}` : '—'}
            nada="peringatan"
            catatan={
              ringkas.naik
                ? `${ringkas.naik.baris.jenis_penyakit}, rata-rata 4 minggu ${fmt(ringkas.naik.baris.rata2_4minggu ?? 0)}`
                : 'Tidak ada penyakit di atas rata-rata 4 minggu'
            }
            onClick={ringkas.naik ? () => pilihPenyakit(ringkas.naik!.baris.jenis_penyakit_id) : undefined}
          />
        </div>

        {/* ==== TABEL SNAPSHOT MINGGU ==== */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
            <div className="flex gap-1.5" role="group" aria-label="Saring tabel">
              {([
                ['semua', 'Semua', dataTerurut.length],
                ['ada', 'Ada kasus', ringkas.ada],
                ['alert', 'Alert', jumlahAlert],
              ] as const).map(([kunci, label, jumlahItem]) => (
                <button
                  key={kunci}
                  type="button"
                  aria-pressed={mode === kunci}
                  onClick={() => setMode(kunci)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
                    mode === kunci
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500'
                  }`}
                >
                  {label} <span className="tabular-nums opacity-70">{jumlahItem}</span>
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="skdr-cari">Cari penyakit</label>
            <input
              id="skdr-cari"
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari penyakit"
              className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Jenis penyakit</th>
                  <th className="px-3 py-2 text-right font-medium">Kasus minggu ini</th>
                  <th className="px-3 py-2 text-right font-medium">Rata² 4 minggu</th>
                  <th className="px-3 py-2 text-right font-medium">Ambang atas</th>
                  <th className="px-3 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tampil.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Tidak ada penyakit yang cocok. Ubah saringan atau kata kunci.
                    </td>
                  </tr>
                )}
                {tampil.map((d, i) => {
                  const kasus = d.jumlah_kasus ?? 0;
                  const rasio = d.ambang_atas && d.ambang_atas > 0 ? Math.min(1, kasus / d.ambang_atas) : 0;
                  const terpilih = penyakitTerpilih !== null && penyakitTerpilih === d.jenis_penyakit_id;
                  return (
                    <tr
                      key={`${d.jenis_penyakit_id ?? 'null'}-${i}`}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        d.status_alert ? 'bg-red-50 hover:bg-red-100' : ''
                      } ${terpilih ? 'shadow-[inset_3px_0_0_0_#1e293b]' : ''}`}
                      onClick={() => pilihPenyakit(d.jenis_penyakit_id)}
                    >
                      <td className="px-3 py-2">
                        <button type="button" className="text-left focus-visible:outline-none focus-visible:underline">
                          {d.jenis_penyakit}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {rasio > 0 && (
                            <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 sm:block" aria-hidden="true">
                              <span
                                className={`block h-full rounded-full ${d.status_alert ? 'bg-red-600' : 'bg-slate-500'}`}
                                style={{ width: `${Math.round(rasio * 100)}%` }}
                              />
                            </span>
                          )}
                          <span className="font-medium tabular-nums">{fmt(kasus)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(d.rata2_4minggu ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(d.ambang_atas ?? 0)}</td>
                      <td className="px-3 py-2 text-center">
                        {d.status_alert ? (
                          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">ALERT</span>
                        ) : (
                          <span className="text-xs text-slate-400">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==== ANALISIS/PREDIKSI AI — SNAPSHOT MINGGU ==== */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Analisis & Prediksi AI — Minggu {minggu}, {tahun} ({wilayahKerja ? wilayahKerja.replace(/_/g, ' ') : 'Seluruh Wilayah Kerja'})
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BoxAnalisisAI sudahLogin={sudahLogin} role={role} konteks="skdr-mingguan" periodeKey={periodeKey} wilayahKerja={wilayahKerja} />
          <BoxPrediksiAI sudahLogin={sudahLogin} role={role} konteks="skdr-mingguan" periodeKey={periodeKey} wilayahKerja={wilayahKerja} />
        </div>
      </div>

      {/* ==== PANEL TREN PER PENYAKIT ==== */}
      <div ref={panelTrenRef} className="scroll-mt-4">
        <TrenPenyakitPanel
          tahunAwal={tahun}
          wilayahKerja={wilayahKerja}
          jenisPenyakitAwal={penyakitTerpilih}
          sudahLogin={sudahLogin}
          role={role}
        />
      </div>
    </div>
  );
}

// ==================== Kartu Ringkas ====================

function KartuRingkas({
  judul,
  nilai,
  catatan,
  bar,
  nada = 'netral',
  aktif,
  onClick,
}: {
  judul: string;
  nilai: string;
  catatan: string;
  /** Rasio 0 sampai 1 untuk batang kecil di bawah kartu. */
  bar?: number;
  nada?: 'netral' | 'peringatan';
  /** Isi hanya untuk kartu yang berfungsi sebagai saklar saringan. */
  aktif?: boolean;
  onClick?: () => void;
}) {
  const warnaNilai = nada === 'peringatan' ? 'text-amber-700' : 'text-slate-900';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={aktif}
      className={`flex flex-col rounded-xl border bg-white p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:cursor-default ${
        aktif ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200 enabled:hover:border-slate-400'
      }`}
    >
      <span className="text-sm text-slate-600">{judul}</span>
      <span className={`mt-2 text-3xl font-semibold tabular-nums ${warnaNilai}`}>{nilai}</span>
      <span className="mt-1 line-clamp-2 text-xs text-slate-500">{catatan}</span>
      {bar !== undefined && (
        <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <span className="block h-full rounded-full bg-slate-700" style={{ width: `${Math.round(bar * 100)}%` }} />
        </span>
      )}
    </button>
  );
}

// ==================== Panel Tren ====================

function TrenPenyakitPanel({
  tahunAwal,
  wilayahKerja,
  jenisPenyakitAwal,
  sudahLogin,
  role,
}: {
  tahunAwal: number;
  wilayahKerja?: string;
  jenisPenyakitAwal: number | null;
  sudahLogin: boolean;
  role: PeranUser | null;
}) {
  const [jenisPenyakitId, setJenisPenyakitId] = useState<number>(jenisPenyakitAwal ?? DAFTAR_PENYAKIT_SKDR[0].id);
  const [tahun, setTahun] = useState(tahunAwal);
  const [modeRentang, setModeRentang] = useState<'mingguan' | 'bulanan'>('mingguan');
  const [mgDari, setMgDari] = useState(1);
  const [mgSampai, setMgSampai] = useState(53);
  const [bulanDari, setBulanDari] = useState(0);
  const [bulanSampai, setBulanSampai] = useState(11);
  const [dataMentah, setDataMentah] = useState<{ minggu_epid: number; jumlah_kasus: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (jenisPenyakitAwal !== null) setJenisPenyakitId(jenisPenyakitAwal);
  }, [jenisPenyakitAwal]);

  useEffect(() => {
    let batal = false;
    setLoading(true);
    const supabase = createClient();
    (async () => {
      let q = supabase
        .from('skdr_mingguan')
        .select('minggu_epid, jumlah_kasus, wilayah_kerja')
        .eq('tahun_epid', tahun)
        .eq('jenis_penyakit_id', jenisPenyakitId)
        .order('minggu_epid');
      if (wilayahKerja) q = q.eq('wilayah_kerja', wilayahKerja);
      const { data } = await q;
      if (batal) return;
      const map = new Map<number, number>();
      (data ?? []).forEach((d) => map.set(d.minggu_epid, (map.get(d.minggu_epid) ?? 0) + (d.jumlah_kasus ?? 0)));
      setDataMentah(Array.from(map.entries()).map(([minggu_epid, jumlah_kasus]) => ({ minggu_epid, jumlah_kasus })));
      setLoading(false);
    })();
    return () => { batal = true; };
  }, [tahun, jenisPenyakitId, wilayahKerja]);

  const trenMingguan = useMemo(() => {
    const peta = new Map<number, number>();
    for (let m = mgDari; m <= mgSampai; m++) peta.set(m, 0);
    dataMentah.forEach((d) => {
      if (d.minggu_epid >= mgDari && d.minggu_epid <= mgSampai) {
        peta.set(d.minggu_epid, (peta.get(d.minggu_epid) ?? 0) + d.jumlah_kasus);
      }
    });
    return Array.from(peta.entries()).map(([minggu, kasus]) => ({ minggu: `Mg${minggu}`, kasus }));
  }, [dataMentah, mgDari, mgSampai]);

  const trenBulanan = useMemo(() => {
    return RENTANG_BULAN_SKDR.slice(bulanDari, bulanSampai + 1).map((b) => {
      const kasus = dataMentah
        .filter((d) => d.minggu_epid >= b.dari && d.minggu_epid <= b.sampai)
        .reduce((sum, d) => sum + d.jumlah_kasus, 0);
      return { bulan: b.label, kasus };
    });
  }, [dataMentah, bulanDari, bulanSampai]);

  const namaPenyakit = DAFTAR_PENYAKIT_SKDR.find((p) => p.id === jenisPenyakitId)?.nama ?? '';

  const periodeKeyTren = useMemo(() => {
    return modeRentang === 'mingguan'
      ? `${tahun}-W${mgDari}_W${mgSampai}`
      : `${tahun}-M${bulanDari + 1}_M${bulanSampai + 1}`;
  }, [modeRentang, tahun, mgDari, mgSampai, bulanDari, bulanSampai]);

  const konteksTrenAI = modeRentang === 'mingguan' ? 'skdr-tren-mingguan' : 'skdr-tren-bulanan';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
      <div className="flex flex-wrap gap-4 items-end justify-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Jenis Penyakit</label>
          <select
            value={jenisPenyakitId}
            onChange={(e) => setJenisPenyakitId(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {DAFTAR_PENYAKIT_SKDR.map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tahun</label>
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-24 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Jenis rentang</label>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            <button
              onClick={() => setModeRentang('mingguan')}
              className={`px-3 py-1.5 ${modeRentang === 'mingguan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setModeRentang('bulanan')}
              className={`px-3 py-1.5 ${modeRentang === 'bulanan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {modeRentang === 'mingguan' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Minggu dari</label>
              <select value={mgDari} onChange={(e) => setMgDari(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                {Array.from({ length: 53 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Mg {m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Minggu sampai</label>
              <select value={mgSampai} onChange={(e) => setMgSampai(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                {Array.from({ length: 53 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Mg {m}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bulan dari</label>
              <select value={bulanDari} onChange={(e) => setBulanDari(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                {RENTANG_BULAN_SKDR.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bulan sampai</label>
              <select value={bulanSampai} onChange={(e) => setBulanSampai(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                {RENTANG_BULAN_SKDR.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      <h3 className="text-sm text-center font-semibold text-slate-700">
        Distribusi {namaPenyakit} di {wilayahKerja ? ` ${wilayahKerja.replace(/_/g, ' ')}` : ' Seluruh Wilayah Kerja'} pada {modeRentang === 'mingguan' ? `Minggu ${mgDari}-${mgSampai}` : `${RENTANG_BULAN_SKDR[bulanDari].label}-${RENTANG_BULAN_SKDR[bulanSampai].label}`}, Tahun {tahun}
      </h3>

      {loading ? (
        <p className="text-sm text-slate-400 text-center">Memuat data...</p>
      ) : (
        <div style={{ width: '100%', height: 280 }}>
          {modeRentang === 'mingguan' ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
              <LineChart data={trenMingguan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="minggu" fontSize={11} interval="preserveStartEnd" />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="kasus" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
              <BarChart data={trenBulanan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="kasus" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ==== ANALISIS/PREDIKSI AI — MENGIKUTI RENTANG & PENYAKIT DI PANEL INI ==== */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Analisis & Prediksi AI — {namaPenyakit} (
          {modeRentang === 'mingguan' ? `Mg ${mgDari}-${mgSampai}` : `${RENTANG_BULAN_SKDR[bulanDari].label}-${RENTANG_BULAN_SKDR[bulanSampai].label}`}, {tahun})
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BoxAnalisisAI
            sudahLogin={sudahLogin}
            role={role}
            konteks={konteksTrenAI}
            periodeKey={periodeKeyTren}
            wilayahKerja={wilayahKerja}
            metrik={String(jenisPenyakitId)}
            wajibWilayahKerja={false}
          />
          <BoxPrediksiAI
            sudahLogin={sudahLogin}
            role={role}
            konteks={konteksTrenAI}
            periodeKey={periodeKeyTren}
            wilayahKerja={wilayahKerja}
            metrik={String(jenisPenyakitId)}
            wajibWilayahKerja={false}
          />
        </div>
      </div>
    </div>
  );
}