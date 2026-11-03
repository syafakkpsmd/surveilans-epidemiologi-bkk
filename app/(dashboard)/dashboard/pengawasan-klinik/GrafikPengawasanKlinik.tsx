// app/(dashboard)/dashboard/pengawasan-klinik/GrafikPengawasanKlinik.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Satu baris = satu kali pengawasan ke satu klinik. */
export type RiwayatPengawasan = {
  id: string;
  klinikId: string;
  namaKlinik: string;
  tanggal: string; // 'YYYY-MM-DD' atau ISO
  persentase: number; // 0–100
  status: string; // memenuhi_syarat | perlu_perbaikan | tidak_memenuhi_syarat
  jumlahItemBermasalah: number;
  itemBermasalah: string[]; // nama tiap item yang bermasalah pada kunjungan ini
};

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/* ---------- minggu epidemiologi (MMWR) ---------- */

function awalMingguMmwr(tahun: number) {
  const jan1 = new Date(Date.UTC(tahun, 0, 1));
  const hari = jan1.getUTCDay(); // 0 = Minggu
  const mulai = new Date(jan1);
  mulai.setUTCDate(jan1.getUTCDate() - hari);
  if (hari > 3) mulai.setUTCDate(mulai.getUTCDate() + 7); // minggu 1 harus punya >= 4 hari
  return mulai;
}

function mingguMmwr(tanggal: Date): { tahun: number; minggu: number } {
  let tahun = tanggal.getUTCFullYear();
  let mulai = awalMingguMmwr(tahun);

  if (tanggal < mulai) {
    tahun -= 1;
    mulai = awalMingguMmwr(tahun);
  } else {
    const berikutnya = awalMingguMmwr(tahun + 1);
    if (tanggal >= berikutnya) {
      tahun += 1;
      mulai = berikutnya;
    }
  }

  const minggu = Math.floor((tanggal.getTime() - mulai.getTime()) / (7 * 86_400_000)) + 1;
  return { tahun, minggu };
}

function parseTanggal(nilai: string): Date | null {
  const d = new Date(nilai);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------- komponen ---------- */

export default function GrafikPengawasanKlinik({
  riwayat,
}: {
  riwayat: RiwayatPengawasan[];
}) {
  const tahunTersedia = useMemo(() => {
    const set = new Set<number>();
    riwayat.forEach((r) => {
      const d = parseTanggal(r.tanggal);
      if (d) set.add(d.getUTCFullYear());
    });
    if (set.size === 0) set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [riwayat]);

  const [tahun, setTahun] = useState<number>(tahunTersedia[0]);
  const [bulanDari, setBulanDari] = useState(1);
  const [bulanSampai, setBulanSampai] = useState(12);
  const [mingguDari, setMingguDari] = useState(1);
  const [mingguSampai, setMingguSampai] = useState(53);

  const dataBulanan = useMemo(() => {
    const ember = new Map<number, { jumlah: number; total: number }>();
    riwayat.forEach((r) => {
      const d = parseTanggal(r.tanggal);
      if (!d || d.getUTCFullYear() !== tahun) return;
      const bulan = d.getUTCMonth() + 1;
      if (bulan < bulanDari || bulan > bulanSampai) return;
      const e = ember.get(bulan) ?? { jumlah: 0, total: 0 };
      e.jumlah += 1;
      e.total += Number(r.persentase) || 0;
      ember.set(bulan, e);
    });

    const hasil = [];
    for (let b = bulanDari; b <= bulanSampai; b++) {
      const e = ember.get(b);
      hasil.push({
        label: NAMA_BULAN[b - 1].slice(0, 3),
        jumlah: e?.jumlah ?? 0,
        kepatuhan: e && e.jumlah ? Number((e.total / e.jumlah).toFixed(1)) : 0,
      });
    }
    return hasil;
  }, [riwayat, tahun, bulanDari, bulanSampai]);

  const dataMingguan = useMemo(() => {
    const ember = new Map<number, { jumlah: number; total: number }>();
    riwayat.forEach((r) => {
      const d = parseTanggal(r.tanggal);
      if (!d) return;
      const { tahun: th, minggu } = mingguMmwr(d);
      if (th !== tahun || minggu < mingguDari || minggu > mingguSampai) return;
      const e = ember.get(minggu) ?? { jumlah: 0, total: 0 };
      e.jumlah += 1;
      e.total += Number(r.persentase) || 0;
      ember.set(minggu, e);
    });

    const hasil = [];
    for (let m = mingguDari; m <= mingguSampai; m++) {
      const e = ember.get(m);
      hasil.push({
        label: `M${m}`,
        jumlah: e?.jumlah ?? 0,
        kepatuhan: e && e.jumlah ? Number((e.total / e.jumlah).toFixed(1)) : 0,
      });
    }
    return hasil;
  }, [riwayat, tahun, mingguDari, mingguSampai]);

  const totalBulanan = dataBulanan.reduce((s, d) => s + d.jumlah, 0);
  const totalMingguan = dataMingguan.reduce((s, d) => s + d.jumlah, 0);

  const kelasSelect = 'border rounded px-2 py-1 text-sm bg-white';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-medium">Tren Pengawasan</h2>
        <label className="text-sm text-gray-600 flex items-center gap-2">
          Tahun
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className={kelasSelect}>
            {tahunTersedia.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Bar bulanan */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className="font-medium text-sm">Pengawasan per Bulan</p>
            <p className="text-xs text-gray-500">{totalBulanan} pengawasan pada rentang terpilih</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Bulan</span>
            <select
              value={bulanDari}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBulanDari(v);
                if (v > bulanSampai) setBulanSampai(v);
              }}
              className={kelasSelect}
            >
              {NAMA_BULAN.map((nama, i) => (
                <option key={nama} value={i + 1}>{nama}</option>
              ))}
            </select>
            <span className="text-gray-600">s.d.</span>
            <select
              value={bulanSampai}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBulanSampai(v);
                if (v < bulanDari) setBulanDari(v);
              }}
              className={kelasSelect}
            >
              {NAMA_BULAN.map((nama, i) => (
                <option key={nama} value={i + 1}>{nama}</option>
              ))}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dataBulanan} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="kiri" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="kanan" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(nilai, nama) =>
                nama === 'Rata-rata kepatuhan' ? [`${nilai}%`, nama] : [nilai, nama]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="kiri" dataKey="jumlah" name="Jumlah pengawasan" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="kanan" dataKey="kepatuhan" name="Rata-rata kepatuhan" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line mingguan */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className="font-medium text-sm">Pengawasan per Minggu Epidemiologi</p>
            <p className="text-xs text-gray-500">{totalMingguan} pengawasan pada rentang terpilih</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Minggu ke</span>
            <select
              value={mingguDari}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMingguDari(v);
                if (v > mingguSampai) setMingguSampai(v);
              }}
              className={kelasSelect}
            >
              {Array.from({ length: 53 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-gray-600">s.d.</span>
            <select
              value={mingguSampai}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMingguSampai(v);
                if (v < mingguDari) setMingguDari(v);
              }}
              className={kelasSelect}
            >
              {Array.from({ length: 53 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dataMingguan} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kiri" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="kanan" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(nilai, nama) =>
                nama === 'Rata-rata kepatuhan' ? [`${nilai}%`, nama] : [nilai, nama]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="kiri" type="monotone" dataKey="jumlah" name="Jumlah pengawasan" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="kanan" type="monotone" dataKey="kepatuhan" name="Rata-rata kepatuhan" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}