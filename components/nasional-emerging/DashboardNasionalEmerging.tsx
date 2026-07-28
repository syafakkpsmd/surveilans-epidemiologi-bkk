'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import dynamic from 'next/dynamic';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import type { PeranUser } from '@/types/database.types';
import { DAFTAR_PENYAKIT_NASIONAL } from '@/lib/ai/konstanta-penyakit';

const NasionalEmergingPeta = dynamic(
  () => import('@/components/nasional-emerging/NasionalEmergingPeta'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-105 items-center justify-center rounded-xl border text-sm text-slate-400">
        Memuat peta...
      </div>
    ),
  }
);

// ==== Konfigurasi ====
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DAFTAR_PENYAKIT = DAFTAR_PENYAKIT_NASIONAL;
const OPSI_PETA_PENYAKIT = ['Semua Penyakit', ...DAFTAR_PENYAKIT_NASIONAL];
const DAFTAR_TAHUN = [2026, 2025, 2024];

const RENTANG_BULAN: { label: string; dari: number; sampai: number }[] = [
  { label: 'Januari', dari: 1, sampai: 4 },
  { label: 'Februari', dari: 5, sampai: 8 },
  { label: 'Maret', dari: 9, sampai: 13 },
  { label: 'April', dari: 14, sampai: 17 },
  { label: 'Mei', dari: 18, sampai: 21 },
  { label: 'Juni', dari: 22, sampai: 26 },
  { label: 'Juli', dari: 27, sampai: 30 },
  { label: 'Agustus', dari: 31, sampai: 35 },
  { label: 'September', dari: 36, sampai: 39 },
  { label: 'Oktober', dari: 40, sampai: 43 },
  { label: 'November', dari: 44, sampai: 48 },
  { label: 'Desember', dari: 49, sampai: 53 },
];

function normalisasiNama(nama: string = ''): string {
  return nama
    .toLowerCase()
    .replace(/^provinsi\s+|^propinsi\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

type Baris = {
  penyakit: string;
  propinsi: string;
  tahun_epid: number;
  minggu_epid: number;
  jumlah_kasus: number;
  jumlah_kematian: number;
};

interface Props {
  sudahLogin: boolean;
  role: PeranUser | null;
}

export default function DashboardNasionalEmerging({ sudahLogin, role }: Props) {
  const [penyakit, setPenyakit] = useState<string>(DAFTAR_PENYAKIT[0]);
  const [tahun, setTahun] = useState(DAFTAR_TAHUN[0]);
  const [penyakitPeta, setPenyakitPeta] = useState<string>('Semua Penyakit');
  const [dataPeta, setDataPeta] = useState<Baris[]>([]);
  const [tampilkanLabelPeta, setTampilkanLabelPeta] = useState(true);
  const [modeRentang, setModeRentang] = useState<'mingguan' | 'bulanan'>('mingguan');
  const [mgDari, setMgDari] = useState(1);
  const [mgSampai, setMgSampai] = useState(53);
  const [bulanDari, setBulanDari] = useState(0);
  const [bulanSampai, setBulanSampai] = useState(11);

  const [data, setData] = useState<Baris[]>([]);
  const [loading, setLoading] = useState(false);

  // Rentang minggu efektif
  const rentangEfektif = useMemo(() => {
    if (modeRentang === 'mingguan') return { dari: mgDari, sampai: mgSampai };
    return { dari: RENTANG_BULAN[bulanDari].dari, sampai: RENTANG_BULAN[bulanSampai].sampai };
  }, [modeRentang, mgDari, mgSampai, bulanDari, bulanSampai]);

  // periodeKey, format sama persis dengan Global Emerging:
  // mingguan -> "2026-W1_W20", bulanan -> "2026-M1_M7"
  const periodeKey = useMemo(() => {
    return modeRentang === 'mingguan'
      ? `${tahun}-W${mgDari}_W${mgSampai}`
      : `${tahun}-M${bulanDari + 1}_M${bulanSampai + 1}`;
  }, [modeRentang, tahun, mgDari, mgSampai, bulanDari, bulanSampai]);

  // 1. INI YANG ASLI — untuk chart tren (WAJIB ADA, jangan sampai hilang)
useEffect(() => {
  async function ambilData() {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('laporan_penyakit_nasional')
      .select('*')
      .eq('penyakit', penyakit)
      .eq('tahun_epid', tahun);
    if (!error && rows) setData(rows as Baris[]);
    setLoading(false);
  }
  ambilData();
}, [penyakit, tahun]);

// 2. INI YANG BARU — khusus untuk peta
useEffect(() => {
  async function ambilDataPeta() {
    const { data: rows, error } = await supabase
      .from('laporan_penyakit_nasional')
      .select('*')
      .eq('tahun_epid', tahun);
    if (!error && rows) setDataPeta(rows as Baris[]);
  }
  ambilDataPeta();
}, [tahun]);

const dataRentang = useMemo(
  () => data.filter(r => r.minggu_epid >= rentangEfektif.dari && r.minggu_epid <= rentangEfektif.sampai),
  [data, rentangEfektif]
);
  const trenMingguan = useMemo(() => {
    const peta = new Map<number, number>();
    for (let m = rentangEfektif.dari; m <= rentangEfektif.sampai; m++) peta.set(m, 0);
    dataRentang.forEach(r => peta.set(r.minggu_epid, (peta.get(r.minggu_epid) || 0) + r.jumlah_kasus));
    return Array.from(peta.entries()).map(([minggu, kasus]) => ({ minggu: `Mg${minggu}`, kasus }));
  }, [dataRentang, rentangEfektif]);

  const trenBulanan = useMemo(() => {
    return RENTANG_BULAN.slice(bulanDari, bulanSampai + 1).map((b) => {
      const kasus = data
        .filter((r) => r.minggu_epid >= b.dari && r.minggu_epid <= b.sampai)
        .reduce((sum, r) => sum + r.jumlah_kasus, 0);
      return { bulan: b.label, kasus };
    });
  }, [data, bulanDari, bulanSampai]);

  const perPropinsi = useMemo(() => {
    const peta = new Map<string, number>();
    dataRentang.forEach(r => peta.set(r.propinsi, (peta.get(r.propinsi) || 0) + r.jumlah_kasus));
    return Array.from(peta.entries())
      .map(([propinsi, total_kasus]) => ({ propinsi, total_kasus }))
      .sort((a, b) => b.total_kasus - a.total_kasus);
  }, [dataRentang]);

  const perPropinsiPeta = useMemo(() => {
    const dataTerfilter = dataPeta.filter((r) => {
        const dalamRentang = r.minggu_epid >= rentangEfektif.dari && r.minggu_epid <= rentangEfektif.sampai;
        const sesuaiPenyakit = penyakitPeta === 'Semua Penyakit' || r.penyakit === penyakitPeta;
        return dalamRentang && sesuaiPenyakit;
    });

    const peta = new Map<string, { total_kasus: number; breakdown: Map<string, number> }>();
    dataTerfilter.forEach((r) => {
        const existing = peta.get(r.propinsi) ?? { total_kasus: 0, breakdown: new Map<string, number>() };
        existing.total_kasus += r.jumlah_kasus;
        existing.breakdown.set(r.penyakit, (existing.breakdown.get(r.penyakit) ?? 0) + r.jumlah_kasus);
        peta.set(r.propinsi, existing);
    });

    return Array.from(peta.entries()).map(([propinsi, v]) => ({
        propinsi,
        total_kasus: v.total_kasus,
        breakdown: Array.from(v.breakdown.entries())
        .map(([penyakit, jumlah_kasus]) => ({ penyakit, jumlah_kasus }))
        .sort((a, b) => b.jumlah_kasus - a.jumlah_kasus),
    }));
  }, [dataPeta, rentangEfektif, penyakitPeta]);

  const totalKasus = perPropinsi.reduce((s, p) => s + p.total_kasus, 0);
  const propinsiTertinggi = perPropinsi[0];

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Penyakit Infeksi Emerging — Nasional</h1>
        <p className="text-slate-500 text-sm">Surveilans Epidemiologi BKK Kelas I Samarinda</p>
      </div>

      {/* ==== FILTER ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Penyakit</label>
            <select value={penyakit} onChange={e => setPenyakit(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              {DAFTAR_PENYAKIT.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tahun</label>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              {DAFTAR_TAHUN.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Jenis rentang</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
              <button onClick={() => setModeRentang('mingguan')}
                className={`px-3 py-1.5 ${modeRentang === 'mingguan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                Mingguan
              </button>
              <button onClick={() => setModeRentang('bulanan')}
                className={`px-3 py-1.5 ${modeRentang === 'bulanan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                Bulanan
              </button>
            </div>
          </div>

          {modeRentang === 'mingguan' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Minggu dari</label>
                <select value={mgDari} onChange={e => setMgDari(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Mg {m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Minggu sampai</label>
                <select value={mgSampai} onChange={e => setMgSampai(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Mg {m}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bulan dari</label>
                <select value={bulanDari} onChange={e => setBulanDari(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  {RENTANG_BULAN.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bulan sampai</label>
                <select value={bulanSampai} onChange={e => setBulanSampai(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  {RENTANG_BULAN.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==== RINGKASAN ==== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KartuRingkas label="Total kasus (rentang dipilih)" nilai={totalKasus} />
        <KartuRingkas label="Propinsi tertinggi" nilai={propinsiTertinggi ? propinsiTertinggi.propinsi : '-'}
          sub={propinsiTertinggi ? `${propinsiTertinggi.total_kasus} kasus` : ''} />
        <KartuRingkas label="Jumlah propinsi melapor kasus" nilai={perPropinsi.filter(p => p.total_kasus > 0).length} />
      </div>

      {/* ==== GRAFIK TREN ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h2 className="text-sm text-center font-semibold text-slate-700 mb-3">
          Tren Kasus {penyakit} dalam {modeRentang === 'mingguan' ? 'mingguan' : 'Bulanan'} Tahun {tahun}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">Memuat data...</p>
        ) : modeRentang === 'mingguan' ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trenMingguan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="minggu" fontSize={11} interval="preserveStartEnd" />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="kasus" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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

      {/* ==== BOX ANALISIS/PREDIKSI AI ==== */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Analisis & Prediksi AI — {penyakit} ({modeRentang === 'mingguan' ? `Mg ${rentangEfektif.dari}-${rentangEfektif.sampai}` : `${RENTANG_BULAN[bulanDari].label}-${RENTANG_BULAN[bulanSampai].label}`}, {tahun})
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BoxAnalisisAI
            sudahLogin={sudahLogin}
            role={role}
            konteks={`nasional-emerging-${modeRentang}`}
            periodeKey={periodeKey}
            wilayahKerja={undefined}
            metrik={penyakit}
            wajibWilayahKerja={false}
          />
          <BoxPrediksiAI
            sudahLogin={sudahLogin}
            role={role}
            konteks={`nasional-emerging-${modeRentang}`}
            periodeKey={periodeKey}
            wilayahKerja={undefined}
            metrik={penyakit}
            wajibWilayahKerja={false}
          />
        </div>
      </div>

      {/* ==== RANKING PROPINSI ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">10 propinsi kasus terbanyak (rentang dipilih)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={perPropinsi.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" fontSize={11} allowDecimals={false} />
            <YAxis type="category" dataKey="propinsi" fontSize={11} width={120} />
            <Tooltip />
            <Bar dataKey="total_kasus" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ==== PETA NASIONAL ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-sm font-semibold text-slate-700">Peta Sebaran Kasus per Propinsi selama Tahun {tahun}</h2>
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={tampilkanLabelPeta}
                    onChange={(e) => setTampilkanLabelPeta(e.target.checked)}
                    className="h-3.5 w-3.5"
                />
                Tampilkan label
                </label>
                <select
                value={penyakitPeta}
                onChange={(e) => setPenyakitPeta(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                >
                {OPSI_PETA_PENYAKIT.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">
           Scroll untuk Zoom | Klik & Geser untuk Pindah
        </p>
        <NasionalEmergingPeta
            perPropinsi={perPropinsiPeta}
            tampilkanBreakdown={penyakitPeta === 'Semua Penyakit'}
            tampilkanLabel={tampilkanLabelPeta}
        />
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <span>Tidak ada kasus</span>
            <span className="w-4 h-4 rounded border border-slate-300" style={{ background: '#e2e8f0' }} />
            <span className="ml-2">Rendah</span>
            <span className="w-4 h-4 rounded" style={{ background: '#fde68a' }} />
            <span className="w-4 h-4 rounded" style={{ background: '#fbbf24' }} />
            <span className="w-4 h-4 rounded" style={{ background: '#f97316' }} />
            <span className="w-4 h-4 rounded" style={{ background: '#dc2626' }} />
            <span className="w-4 h-4 rounded" style={{ background: '#7f1d1d' }} />
            <span>Tinggi</span>
        </div>
      </div>

      {/* ==== DATA MENTAH (10 terbaru) ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-x-auto">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Data mentah (10 terbaru)</h2>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4">Propinsi</th>
              <th className="py-2 pr-4">Minggu</th>
              <th className="py-2 pr-4">Jumlah kasus</th>
              <th className="py-2 pr-4">Jumlah kematian</th>
            </tr>
          </thead>
          <tbody>
            {dataRentang
              .slice()
              .sort((a, b) => b.minggu_epid - a.minggu_epid || a.propinsi.localeCompare(b.propinsi))
              .slice(0, 10)
              .map((r, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-1.5 pr-4 font-medium text-slate-700">{r.propinsi}</td>
                  <td className="py-1.5 pr-4">Mg {r.minggu_epid}</td>
                  <td className="py-1.5 pr-4">{r.jumlah_kasus}</td>
                  <td className="py-1.5 pr-4">{r.jumlah_kematian}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KartuRingkas({ label, nilai, sub }: { label: string; nilai: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1">{nilai}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}