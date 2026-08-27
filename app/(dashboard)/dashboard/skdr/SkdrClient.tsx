'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();

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
      const { data: baru } = await q;
      setData(baru ?? []);
    });
  }

  // Baris siap tampil: kalau wilayah dipilih -> filter langsung dari data yang ada;
  // kalau "Semua Wilayah Kerja" -> jumlahkan lintas wilayah per jenis penyakit.
  const dataTerurut = useMemo(() => {
    let hasil: BarisSkdr[];
    if (wilayahKerja) {
      hasil = data.filter((d) => d.wilayah_kerja === wilayahKerja);
    } else {
      const map = new Map<number, BarisSkdr>();
      data.forEach((d) => {
        if (d.jenis_penyakit_id === null) return;
        const existing = map.get(d.jenis_penyakit_id);
        if (existing) {
          existing.jumlah_kasus = (existing.jumlah_kasus ?? 0) + (d.jumlah_kasus ?? 0);
        } else {
          map.set(d.jenis_penyakit_id, { ...d });
        }
      });
      hasil = Array.from(map.values());
    }
    return [...hasil].sort(
      (a, b) => Number(b.status_alert) - Number(a.status_alert) || (b.jumlah_kasus ?? 0) - (a.jumlah_kasus ?? 0)
    );
  }, [data, wilayahKerja]);

  const jumlahAlert = dataTerurut.filter((d) => d.status_alert).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">SKDR — Sistem Kewaspadaan Dini dan Respon</h1>
        {jumlahAlert > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
            {jumlahAlert} sinyal alert minggu ini
          </span>
        )}
      </div>

      {/* ==== FILTER SNAPSHOT MINGGU ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
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
          Terapkan
        </button>
      </div>

      {/* ==== TABEL SNAPSHOT MINGGU ==== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Jenis Penyakit</th>
              <th className="px-3 py-2 text-right">Kasus Minggu Ini</th>
              <th className="px-3 py-2 text-right">Rata² 4 Minggu</th>
              <th className="px-3 py-2 text-right">Ambang Atas</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {dataTerurut.map((d, i) => (
              <tr
                key={`${d.jenis_penyakit_id ?? 'null'}-${i}`}
                className={`cursor-pointer hover:bg-slate-50 ${d.status_alert ? 'bg-red-50' : ''}`}
                onClick={() => d.jenis_penyakit_id !== null && setPenyakitTerpilih(d.jenis_penyakit_id)}
              >
                <td className="px-3 py-2">{d.jenis_penyakit}</td>
                <td className="px-3 py-2 text-right font-medium">{d.jumlah_kasus ?? 0}</td>
                <td className="px-3 py-2 text-right text-slate-500">{d.rata2_4minggu ?? 0}</td>
                <td className="px-3 py-2 text-right text-slate-500">{d.ambang_atas ?? 0}</td>
                <td className="px-3 py-2 text-center">
                  {d.status_alert ? (
                    <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">ALERT</span>
                  ) : (
                    <span className="text-slate-400 text-xs">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <TrenPenyakitPanel
        tahunAwal={tahun}
        wilayahKerja={wilayahKerja}
        jenisPenyakitAwal={penyakitTerpilih}
        sudahLogin={sudahLogin}
        role={role}
      />
    </div>
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
      <div className="flex flex-wrap gap-4 items-end">
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