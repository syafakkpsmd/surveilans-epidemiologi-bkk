'use client';

// app/(dashboard)/dashboard/kier/KierClient.tsx
import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type {
  RingkasanKier, TitikMingguan, TitikBulanan,
  TitikMingguanPerWilker, TitikBulananPerWilker,
} from '@/lib/turso/kier';

const WARNA_TEAL = '#0d9488';
const WARNA_NAVY = '#1e3a5f';
// Satu palet dipakai di semua donut/chart — warna dikunci berdasarkan POSISI
// label di daftar acuan (urutanTetap), BUKAN berdasarkan urutan besar-kecil
// jumlah data. Jadi warna tiap label tidak berubah-ubah walau datanya berubah.
const PALET_WARNA = ['#0d9488', '#f59e0b', '#1e3a5f', '#ef4444', '#8b5cf6', '#64748b', '#16a34a', '#db2777'];

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface RentangMinggu { mingguAwal: number; mingguAkhir: number }
interface RentangBulan { bulanAwal: number; bulanAkhir: number }

interface Props {
  tahun: number;
  wilayahKerja?: string;
  daftarWilker: string[]; // 5 wilker resmi (untuk dropdown filter)
  daftarWilkerAktifAwal: string[]; // wilker yang benar-benar ada di data (untuk chart breakdown)
  daftarTahun: number[];
  ringkasan: RingkasanKier;
  trenMingguanAwal: TitikMingguan[];
  trenBulananAwal: TitikBulanan[];
  trenMingguanWilkerAwal: TitikMingguanPerWilker[];
  trenBulananWilkerAwal: TitikBulananPerWilker[];
  rentangAwal: { mingguAwal: number; mingguAkhir: number; bulanAwal: number; bulanAkhir: number };
}

export default function KierClient({
  tahun: tahunAwal,
  wilayahKerja: wilkerAwal,
  daftarWilker,
  daftarWilkerAktifAwal,
  daftarTahun,
  ringkasan: ringkasanAwal,
  trenMingguanAwal,
  trenBulananAwal,
  trenMingguanWilkerAwal,
  trenBulananWilkerAwal,
  rentangAwal,
}: Props) {
  const [tahun, setTahun] = useState(tahunAwal);
  const [wilker, setWilker] = useState(wilkerAwal || '');
  const [ringkasan, setRingkasan] = useState(ringkasanAwal);
  const [trenMingguan, setTrenMingguan] = useState(trenMingguanAwal);
  const [trenBulanan, setTrenBulanan] = useState(trenBulananAwal);
  const [trenMingguanWilker, setTrenMingguanWilker] = useState(trenMingguanWilkerAwal);
  const [trenBulananWilker, setTrenBulananWilker] = useState(trenBulananWilkerAwal);
  const [daftarWilkerAktif, setDaftarWilkerAktif] = useState(daftarWilkerAktifAwal);
  const [memuat, setMemuat] = useState(false);

  const [rentangMinggu, setRentangMinggu] = useState<RentangMinggu>({
    mingguAwal: rentangAwal.mingguAwal, mingguAkhir: rentangAwal.mingguAkhir,
  });
  const [rentangBulan, setRentangBulan] = useState<RentangBulan>({
    bulanAwal: rentangAwal.bulanAwal, bulanAkhir: rentangAwal.bulanAkhir,
  });
  const [tempMinggu, setTempMinggu] = useState<RentangMinggu>(rentangMinggu);
  const [tempBulan, setTempBulan] = useState<RentangBulan>(rentangBulan);

  const tampilkanBreakdownWilker = wilker === ''; // hanya saat "Semua Wilayah Kerja" dipilih

  // Warna wilker dikunci berdasarkan posisi di daftarWilker RESMI (5 wilker),
  // supaya konsisten di seluruh dashboard; wilker "asing" (ejaan beda dari
  // sheet) dapat warna lanjutan di paletnya sendiri.
  function warnaWilker(nama: string): string {
    let idx = daftarWilker.indexOf(nama);
    if (idx === -1) idx = daftarWilker.length + daftarWilkerAktif.indexOf(nama);
    return PALET_WARNA[idx % PALET_WARNA.length];
  }

  async function ambilData(
    tahunBaru: number,
    wilkerBaru: string,
    rMinggu: RentangMinggu,
    rBulan: RentangBulan
  ) {
    setMemuat(true);
    try {
      const qs = new URLSearchParams({
        tahun: String(tahunBaru),
        mingguAwal: String(rMinggu.mingguAwal),
        mingguAkhir: String(rMinggu.mingguAkhir),
        bulanAwal: String(rBulan.bulanAwal),
        bulanAkhir: String(rBulan.bulanAkhir),
      });
      if (wilkerBaru) qs.set('wilker', wilkerBaru);

      const res = await fetch(`/api/kier/tren?${qs.toString()}`);
      const data = await res.json();
      if (!data.error) {
        setRingkasan(data.ringkasan);
        setTrenMingguan(data.trenMingguan);
        setTrenBulanan(data.trenBulanan);
        setTrenMingguanWilker(data.trenMingguanWilker);
        setTrenBulananWilker(data.trenBulananWilker);
        if (data.daftarWilkerAktif) setDaftarWilkerAktif(data.daftarWilkerAktif);
      }
    } finally {
      setMemuat(false);
    }
  }

  function terapkanMinggu() {
    setRentangMinggu(tempMinggu);
    ambilData(tahun, wilker, tempMinggu, rentangBulan);
  }

  function terapkanBulan() {
    setRentangBulan(tempBulan);
    ambilData(tahun, wilker, rentangMinggu, tempBulan);
  }

  function gantiTahun(tahunBaru: number) {
    setTahun(tahunBaru);
    ambilData(tahunBaru, wilker, rentangMinggu, rentangBulan);
  }

  function gantiWilker(wilkerBaru: string) {
    setWilker(wilkerBaru);
    ambilData(tahun, wilkerBaru, rentangMinggu, rentangBulan);
  }

  const pilihanMinggu = Array.from({ length: 53 }, (_, i) => i + 1);
  const pilihanBulan = NAMA_BULAN.map((nama, i) => ({ nilai: i + 1, label: nama }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-[#1e3a5f]">
          KIER Kesehatan
        </h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
            value={wilker}
            onChange={(e) => gantiWilker(e.target.value)}
          >
            <option value="">Semua Wilayah Kerja</option>
            {daftarWilker.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
            value={tahun}
            onChange={(e) => gantiTahun(Number(e.target.value))}
          >
            {daftarTahun.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KARTU RINGKAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KartuRingkas label="Total Pemeriksaan" nilai={ringkasan.totalPemeriksaan} />
        <KartuRingkas
          label="Kesimpulan Terbanyak"
          nilai={ringkasan.breakdownKesimpulan[0]?.label || '-'}
          subteks={ringkasan.breakdownKesimpulan[0] ? `${ringkasan.breakdownKesimpulan[0].jumlah} orang` : ''}
        />
        <KartuRingkas
          label="Tujuan Terbanyak"
          nilai={ringkasan.tujuanTerbanyak[0]?.label || '-'}
          subteks={ringkasan.tujuanTerbanyak[0] ? `${ringkasan.tujuanTerbanyak[0].jumlah} orang` : ''}
        />
        <KartuRingkas
          label="Wilker Terbanyak"
          nilai={ringkasan.breakdownWilker[0]?.label || '-'}
          subteks={ringkasan.breakdownWilker[0] ? `${ringkasan.breakdownWilker[0].jumlah} orang` : ''}
        />
      </div>

      {/* DONUT: KESIMPULAN, JENIS KELAMIN, WILKER — warna & urutan dikunci */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutCard title="Breakdown Kesimpulan" data={ringkasan.breakdownKesimpulan} />
        <DonutCard title="Breakdown Jenis Kelamin" data={ringkasan.breakdownJenisKelamin} />
        <DonutCard title="Breakdown Wilayah Kerja" data={ringkasan.breakdownWilker} warnaUntuk={warnaWilker} urutanTetap={daftarWilker} />
      </div>

      {/* ================= SECTION MINGGUAN ================= */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4">
          <FilterRentang
            label="Rentang Minggu"
            pilihan={pilihanMinggu.map((m) => ({ nilai: m, label: `Mg ${m}` }))}
            awal={tempMinggu.mingguAwal}
            akhir={tempMinggu.mingguAkhir}
            onAwal={(v) => setTempMinggu((s) => ({ ...s, mingguAwal: v }))}
            onAkhir={(v) => setTempMinggu((s) => ({ ...s, mingguAkhir: v }))}
          />
          <button
            onClick={terapkanMinggu}
            disabled={memuat}
            className="bg-[#0d9488] hover:bg-[#0b7d73] text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
          >
            {memuat ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-center font-semibold text-[#1e3a5f] mb-3">
            Tren Mingguan Pemeriksaan
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trenMingguan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="jumlah"
                name="Jumlah Pemeriksaan"
                stroke={WARNA_TEAL}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {tampilkanBreakdownWilker && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-center font-semibold text-[#1e3a5f] mb-3">
              Tren Mingguan per Wilayah Kerja
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trenMingguanWilker}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend content={<LegendKustom />} />
                {daftarWilkerAktif.map((w) => (
                  <Line
                    key={w}
                    type="monotone"
                    dataKey={w}
                    name={w}
                    stroke={warnaWilker(w)}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ================= SECTION BULANAN ================= */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4">
          <FilterRentang
            label="Rentang Bulan"
            pilihan={pilihanBulan.map((b) => ({ nilai: b.nilai, label: b.label }))}
            awal={tempBulan.bulanAwal}
            akhir={tempBulan.bulanAkhir}
            onAwal={(v) => setTempBulan((s) => ({ ...s, bulanAwal: v }))}
            onAkhir={(v) => setTempBulan((s) => ({ ...s, bulanAkhir: v }))}
          />
          <button
            onClick={terapkanBulan}
            disabled={memuat}
            className="bg-[#0d9488] hover:bg-[#0b7d73] text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
          >
            {memuat ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-center font-semibold text-[#1e3a5f] mb-3">
            Tren Bulanan Pemeriksaan
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trenBulanan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jumlah" name="Jumlah Pemeriksaan" fill={WARNA_NAVY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {tampilkanBreakdownWilker && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-center font-semibold text-[#1e3a5f] mb-3">
              Tren Bulanan per Wilayah Kerja
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={trenBulananWilker}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend content={<LegendKustom />} />
                {daftarWilkerAktif.map((w) => (
                  <Bar key={w} dataKey={w} name={w} fill={warnaWilker(w)} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function KartuRingkas({ label, nilai, subteks }: { label: string; nilai: string | number; subteks?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 min-h-23 flex flex-col justify-between">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className="text-base md:text-lg font-bold text-[#1e3a5f] mt-1 leading-snug wrap-break-word line-clamp-2"
        title={String(nilai)}
      >
        {nilai}
      </p>
      {subteks && <p className="text-xs text-gray-400 mt-0.5">{subteks}</p>}
    </div>
  );
}

/**
 * Legenda custom: rapi wrap ke bawah dan bullet+teks selalu sejajar
 * (default Legend recharts suka miring/tidak rata kalau teksnya panjang).
 */
function LegendKustom({ payload }: any) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 px-2">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 max-w-55">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600 leading-snug">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutCard({
  title, data, warnaUntuk, urutanTetap,
}: {
  title: string;
  data: { label: string; jumlah: number }[];
  warnaUntuk?: (label: string) => string;
  urutanTetap?: string[];
}) {
  // Urutan tampil DIKUNCI (tidak ikut besar-kecil jumlah) supaya warna &
  // posisi legenda tidak berubah-ubah tiap kali datanya berubah:
  // - kalau ada urutanTetap (mis. daftar wilker resmi), pakai urutan itu
  // - kalau tidak, urutkan alfabetis (lebih stabil dari urutan by count)
  const dataTampil = [...data].sort((a, b) => {
    if (urutanTetap) {
      const ia = urutanTetap.indexOf(a.label);
      const ib = urutanTetap.indexOf(b.label);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
    }
    return a.label.localeCompare(b.label);
  });

  const warna = (label: string, i: number) => (warnaUntuk ? warnaUntuk(label) : PALET_WARNA[i % PALET_WARNA.length]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-center font-semibold text-[#1e3a5f] mb-3">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={dataTampil}
            dataKey="jumlah"
            nameKey="label"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {dataTampil.map((d, i) => (
              <Cell key={d.label} fill={warna(d.label, i)} />
            ))}
          </Pie>
          <Tooltip />
          <Legend content={<LegendKustom />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function FilterRentang({
  label, pilihan, awal, akhir, onAwal, onAkhir,
}: {
  label: string;
  pilihan: { nilai: number; label: string }[];
  awal: number;
  akhir: number;
  onAwal: (v: number) => void;
  onAkhir: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <select
          className="border rounded-lg px-2 py-1.5 text-sm"
          value={awal}
          onChange={(e) => onAwal(Number(e.target.value))}
        >
          {pilihan.map((p) => (
            <option key={p.nilai} value={p.nilai}>{p.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">s/d</span>
        <select
          className="border rounded-lg px-2 py-1.5 text-sm"
          value={akhir}
          onChange={(e) => onAkhir(Number(e.target.value))}
        >
          {pilihan.map((p) => (
            <option key={p.nilai} value={p.nilai}>{p.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}