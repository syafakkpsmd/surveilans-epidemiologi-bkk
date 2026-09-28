'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { SiaosRow } from '@/lib/turso/queriesSiaos';

const DAFTAR_LOKASI = ['Samarinda', 'APT Pranoto', 'Lhoktuan'] as const;

const WARNA_LOKASI: Record<string, string> = {
  Samarinda: '#0f766e',
  'APT Pranoto': '#f59e0b',
  Lhoktuan: '#6366f1',
};
const WARNA_TOTAL = '#0ea5e9';

const WARNA_DONUT = ['#0f766e', '#f59e0b', '#6366f1', '#ef4444', '#0ea5e9', '#a855f7', '#94a3b8'];

const URUTAN_KELOMPOK_USIA = [
  '< 1 Tahun',
  '1-4 Tahun',
  '5-14 Tahun',
  '15-44 Tahun',
  '45-64 Tahun',
  '65+ Tahun',
  'Tidak diketahui',
];

const URUTAN_KURSI_DORONG = ['Tidak', 'Pintu', 'Tempat Duduk'];

const JUMLAH_TOP_DIAGNOSA = 10;
const JUMLAH_TOP_PELABUHAN = 10;

const NAMA_BULAN_INDONESIA = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

type Periode = { key: string; label: string };
type Kategori = { name: string; value: number };

// Data bulan disimpan dalam format "YYYY-MM" (mis. "2026-01"); ini cuma untuk TAMPILAN: "Jan 2026".
function formatBulanIndonesia(bulan: string): string {
  const [tahun, bulanNum] = bulan.split('-');
  const idx = parseInt(bulanNum, 10) - 1;
  const nama = NAMA_BULAN_INDONESIA[idx];
  return nama ? `${nama} ${tahun}` : bulan;
}

// Penomoran minggu versi sederhana (bukan ISO): Mg1 = 7 hari pertama tahun itu, dst.
function getMingguTahun(tanggal: string): { tahun: number; minggu: number } {
  const d = new Date(tanggal);
  const awalTahun = new Date(d.getFullYear(), 0, 1);
  const selisihHari = Math.floor((d.getTime() - awalTahun.getTime()) / 86400000);
  return { tahun: d.getFullYear(), minggu: Math.floor(selisihHari / 7) + 1 };
}

function hariDalamTahun(tahun: number): number {
  return (tahun % 4 === 0 && tahun % 100 !== 0) || tahun % 400 === 0 ? 366 : 365;
}

function totalMingguTahun(tahun: number): number {
  return Math.ceil(hariDalamTahun(tahun) / 7);
}

// Daftar SELURUH minggu yang tersedia (mulai Mg1 tahun paling awal di data, sampai
// minggu terakhir yang ada datanya) -- ini jadi "menu pilihan" untuk dropdown rentang,
// jadi tidak berubah-ubah walaupun lokasi difilter.
function buatDaftarMingguDariData(rows: SiaosRow[]): Periode[] {
  let tahunMin = Infinity;
  let tahunMax = -Infinity;
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const { tahun } = getMingguTahun(d.tanggal);
    if (tahun < tahunMin) tahunMin = tahun;
    if (tahun > tahunMax) tahunMax = tahun;
  });
  if (tahunMin === Infinity) return [];

  let mingguAkhir = 1;
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const { tahun, minggu } = getMingguTahun(d.tanggal);
    if (tahun === tahunMax && minggu > mingguAkhir) mingguAkhir = minggu;
  });

  const multiTahun = tahunMin !== tahunMax;
  const daftar: Periode[] = [];
  for (let tahun = tahunMin; tahun <= tahunMax; tahun++) {
    const batasMinggu = tahun === tahunMax ? mingguAkhir : totalMingguTahun(tahun);
    for (let minggu = 1; minggu <= batasMinggu; minggu++) {
      const label = multiTahun ? `Mg${minggu} '${String(tahun).slice(-2)}` : `Mg${minggu}`;
      daftar.push({ key: `${tahun}-${minggu}`, label });
    }
  }
  return daftar;
}

function hitungPerMinggu(rows: SiaosRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const { tahun, minggu } = getMingguTahun(d.tanggal);
    const key = `${tahun}-${minggu}`;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function hitungPerMingguPerWilayah(rows: SiaosRow[]): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const { tahun, minggu } = getMingguTahun(d.tanggal);
    const key = `${tahun}-${minggu}`;
    if (!map[key]) map[key] = { Samarinda: 0, 'APT Pranoto': 0, Lhoktuan: 0 };
    if (map[key][d.wilayah_kerja] !== undefined) map[key][d.wilayah_kerja]++;
  });
  return map;
}

// Daftar SELURUH bulan yang tersedia (mulai Januari tahun paling awal di data,
// sampai bulan terakhir yang ada datanya) -- jadi "menu pilihan" untuk dropdown rentang.
function buatDaftarBulanDariData(rows: SiaosRow[]): Periode[] {
  let tahunMin = Infinity;
  let bulanAkhir = '';
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const bulan = d.tanggal.slice(0, 7);
    const tahun = parseInt(bulan.slice(0, 4), 10);
    if (tahun < tahunMin) tahunMin = tahun;
    if (!bulanAkhir || bulan > bulanAkhir) bulanAkhir = bulan;
  });
  if (!bulanAkhir) return [];

  const [tahunAkhirStr, bulanAkhirStr] = bulanAkhir.split('-');
  const tahunAkhir = parseInt(tahunAkhirStr, 10);
  const bulanAkhirNum = parseInt(bulanAkhirStr, 10);

  const daftar: Periode[] = [];
  for (let tahun = tahunMin; tahun <= tahunAkhir; tahun++) {
    const batasBulan = tahun === tahunAkhir ? bulanAkhirNum : 12;
    for (let bulan = 1; bulan <= batasBulan; bulan++) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}`;
      daftar.push({ key: ym, label: formatBulanIndonesia(ym) });
    }
  }
  return daftar;
}

function hitungPerBulan(rows: SiaosRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const bulan = d.tanggal.slice(0, 7);
    map[bulan] = (map[bulan] || 0) + 1;
  });
  return map;
}

function hitungPerBulanPerWilayah(rows: SiaosRow[]): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  rows.forEach((d) => {
    if (!d.tanggal) return;
    const bulan = d.tanggal.slice(0, 7);
    if (!map[bulan]) map[bulan] = { Samarinda: 0, 'APT Pranoto': 0, Lhoktuan: 0 };
    if (map[bulan][d.wilayah_kerja] !== undefined) map[bulan][d.wilayah_kerja]++;
  });
  return map;
}

// Ambil potongan `daftar` di antara key `dariKey` dan `sampaiKey` (urutan dibalik
// otomatis diperbaiki). Kalau salah satu/keduanya kosong, dipakai ujung daftar.
function potongRentang(daftar: Periode[], dariKey: string, sampaiKey: string): Periode[] {
  if (daftar.length === 0) return [];
  const idxDari = dariKey ? daftar.findIndex((p) => p.key === dariKey) : 0;
  const idxSampai = sampaiKey ? daftar.findIndex((p) => p.key === sampaiKey) : daftar.length - 1;
  const a = idxDari === -1 ? 0 : idxDari;
  const b = idxSampai === -1 ? daftar.length - 1 : idxSampai;
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return daftar.slice(lo, hi + 1);
}

// Kolom diagnosa berisi teks bebas, kadang lebih dari satu diagnosa dipisah koma
// dalam satu baris. Dipecah supaya bisa dihitung frekuensinya masing-masing.
// Catatan: variasi penulisan/typo tidak digabung otomatis (lihat penjelasan di chat).
function pecahDiagnosa(diagnosa: string | null): string[] {
  if (!diagnosa) return [];
  return diagnosa
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Menyamakan usia ke satuan tahun dulu, karena data sumber mencatat usia dalam
// satuan berbeda-beda (Tahun / Bulan / Hari) -- tidak boleh dibandingkan mentah-mentah.
function konversiUsiaKeTahun(usia: number | null, satuan: string | null): number | null {
  if (usia === null || usia === undefined) return null;
  const satuanLower = (satuan || '').toLowerCase();
  if (satuanLower.includes('bulan')) return usia / 12;
  if (satuanLower.includes('hari')) return usia / 365;
  return usia; // dianggap 'Tahun' (termasuk kalau satuan tidak diisi)
}

function getKelompokUsia(usia: number | null, satuan: string | null): string {
  const usiaTahun = konversiUsiaKeTahun(usia, satuan);
  if (usiaTahun === null) return 'Tidak diketahui';
  if (usiaTahun < 1) return '< 1 Tahun';
  if (usiaTahun <= 4) return '1-4 Tahun';
  if (usiaTahun <= 14) return '5-14 Tahun';
  if (usiaTahun <= 44) return '15-44 Tahun';
  if (usiaTahun <= 64) return '45-64 Tahun';
  return '65+ Tahun';
}

// Helper umum untuk donut kategori: hitung frekuensi nilai mentah suatu field,
// baris kosong/null masuk "Tidak diketahui". `urutanTetap` (opsional) dipakai
// supaya kategori tertentu (mis. Tidak/Pintu/Tempat Duduk) tampil urut & konsisten.
function buatDataKategori(
  rows: SiaosRow[],
  ambilNilai: (d: SiaosRow) => string | null,
  urutanTetap?: string[]
): Kategori[] {
  const map: Record<string, number> = {};
  rows.forEach((d) => {
    const raw = ambilNilai(d);
    const label = raw && raw.trim() ? raw.trim() : 'Tidak diketahui';
    map[label] = (map[label] || 0) + 1;
  });

  if (!urutanTetap) {
    return Object.keys(map).map((label) => ({ name: label, value: map[label] }));
  }

  const utama = urutanTetap.filter((label) => map[label] > 0).map((label) => ({ name: label, value: map[label] }));
  const lainnya = Object.keys(map)
    .filter((label) => !urutanTetap.includes(label))
    .map((label) => ({ name: label, value: map[label] }));
  return [...utama, ...lainnya];
}

export default function SiaosClient({ data }: { data: SiaosRow[] }) {
  const [filterLokasi, setFilterLokasi] = useState<string>('ALL');
  const tampilkanPerWilayah = filterLokasi === 'ALL';

  // ----- Rentang minggu & bulan yang bisa dipilih (dropdown Dari / Sampai) -----
  const [mingguDari, setMingguDari] = useState('');
  const [mingguSampai, setMingguSampai] = useState('');
  const [bulanDari, setBulanDari] = useState('');
  const [bulanSampai, setBulanSampai] = useState('');

  const dataTerfilter = useMemo(() => {
    if (filterLokasi === 'ALL') return data;
    return data.filter((d) => d.wilayah_kerja === filterLokasi);
  }, [data, filterLokasi]);

  const total = dataTerfilter.length;

  const perLokasi = useMemo(() => {
    const map: Record<string, number> = { Samarinda: 0, 'APT Pranoto': 0, Lhoktuan: 0 };
    dataTerfilter.forEach((d) => {
      if (map[d.wilayah_kerja] !== undefined) map[d.wilayah_kerja]++;
    });
    return map;
  }, [dataTerfilter]);

  const totalBulanIni = useMemo(() => {
    const now = new Date();
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return dataTerfilter.filter((d) => (d.tanggal || '').slice(0, 7) === bulanIni).length;
  }, [dataTerfilter]);

  // ----- Menu pilihan minggu/bulan: selalu dari SELURUH data, tidak ikut filter lokasi -----
  const daftarMingguTersedia = useMemo(() => buatDaftarMingguDariData(data), [data]);
  const daftarBulanTersedia = useMemo(() => buatDaftarBulanDariData(data), [data]);

  const mingguTerpilih = useMemo(
    () => potongRentang(daftarMingguTersedia, mingguDari, mingguSampai),
    [daftarMingguTersedia, mingguDari, mingguSampai]
  );
  const bulanTerpilih = useMemo(
    () => potongRentang(daftarBulanTersedia, bulanDari, bulanSampai),
    [daftarBulanTersedia, bulanDari, bulanSampai]
  );

  const periodeMinggu = mingguTerpilih.length
    ? `${mingguTerpilih[0].label} – ${mingguTerpilih[mingguTerpilih.length - 1].label}`
    : '';
  const periodeBulan = bulanTerpilih.length
    ? `${bulanTerpilih[0].label} – ${bulanTerpilih[bulanTerpilih.length - 1].label}`
    : '';

  // ----- Hitungan mentah (tidak bergantung rentang yang dipilih) -----
  const perMingguTotal = useMemo(() => hitungPerMinggu(dataTerfilter), [dataTerfilter]);
  const perMingguWilayah = useMemo(() => hitungPerMingguPerWilayah(data), [data]);
  const perBulanTotal = useMemo(() => hitungPerBulan(dataTerfilter), [dataTerfilter]);
  const perBulanWilayah = useMemo(() => hitungPerBulanPerWilayah(data), [data]);

  // ----- Data siap-pakai untuk tiap grafik, mengikuti rentang yang dipilih -----
  const dataMingguanTotal = useMemo(
    () => mingguTerpilih.map((m) => ({ minggu: m.label, jumlah: perMingguTotal[m.key] || 0 })),
    [mingguTerpilih, perMingguTotal]
  );
  const dataMingguanPerWilayah = useMemo(
    () =>
      mingguTerpilih.map((m) => ({
        minggu: m.label,
        ...(perMingguWilayah[m.key] || { Samarinda: 0, 'APT Pranoto': 0, Lhoktuan: 0 }),
      })),
    [mingguTerpilih, perMingguWilayah]
  );
  const dataBulananTotal = useMemo(
    () => bulanTerpilih.map((b) => ({ bulan: b.key, jumlah: perBulanTotal[b.key] || 0 })),
    [bulanTerpilih, perBulanTotal]
  );
  const dataBulananPerWilayah = useMemo(
    () =>
      bulanTerpilih.map((b) => ({
        bulan: b.key,
        ...(perBulanWilayah[b.key] || { Samarinda: 0, 'APT Pranoto': 0, Lhoktuan: 0 }),
      })),
    [bulanTerpilih, perBulanWilayah]
  );

  const dataJenisKelamin = useMemo(
    () => buatDataKategori(dataTerfilter, (d) => d.jenis_kelamin),
    [dataTerfilter]
  );

  const dataKelompokUsia = useMemo(() => {
    const map: Record<string, number> = {};
    dataTerfilter.forEach((d) => {
      const label = getKelompokUsia(d.usia, d.satuan_usia);
      map[label] = (map[label] || 0) + 1;
    });
    return URUTAN_KELOMPOK_USIA.filter((label) => map[label] > 0).map((label) => ({
      name: label,
      value: map[label],
    }));
  }, [dataTerfilter]);

  // Moda transportasi: MASKAPAI terisi -> Pesawat, PELAYARAN terisi -> Kapal.
  const dataModaTransportasi = useMemo(() => {
    const map: Record<string, number> = { Pesawat: 0, Kapal: 0, 'Tidak diketahui': 0 };
    dataTerfilter.forEach((d) => {
      if (d.maskapai && d.maskapai.trim()) map.Pesawat++;
      else if (d.pelayaran && d.pelayaran.trim()) map.Kapal++;
      else map['Tidak diketahui']++;
    });
    return Object.keys(map)
      .filter((k) => map[k] > 0)
      .map((k) => ({ name: k, value: map[k] }));
  }, [dataTerfilter]);

  const dataMelanjutkanPerjalanan = useMemo(
    () => buatDataKategori(dataTerfilter, (d) => d.kondisi_lanjut_perjalanan),
    [dataTerfilter]
  );
  const dataButuhBantuanMedis = useMemo(
    () => buatDataKategori(dataTerfilter, (d) => d.butuh_bantuan_medis),
    [dataTerfilter]
  );
  const dataPerluKursiDorong = useMemo(
    () => buatDataKategori(dataTerfilter, (d) => d.perlu_kursi_dorong, URUTAN_KURSI_DORONG),
    [dataTerfilter]
  );
  const dataPerluBantuanMakanan = useMemo(
    () => buatDataKategori(dataTerfilter, (d) => d.perlu_bantuan_makanan_medikasi),
    [dataTerfilter]
  );

  const dataPelabuhan = useMemo(() => {
    const map: Record<string, number> = {};
    dataTerfilter.forEach((d) => {
      const label = d.pelabuhan && d.pelabuhan.trim() ? d.pelabuhan : 'Tidak diketahui';
      map[label] = (map[label] || 0) + 1;
    });
    return Object.keys(map)
      .map((label) => ({ name: label, value: map[label] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, JUMLAH_TOP_PELABUHAN);
  }, [dataTerfilter]);

  const dataTopDiagnosa = useMemo(() => {
    const map: Record<string, number> = {};
    dataTerfilter.forEach((d) => {
      pecahDiagnosa(d.diagnosa).forEach((diagnosa) => {
        map[diagnosa] = (map[diagnosa] || 0) + 1;
      });
    });
    return Object.keys(map)
      .map((label) => ({ name: label, value: map[label] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, JUMLAH_TOP_DIAGNOSA);
  }, [dataTerfilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-teal-900">Dashboard SIAOS</h1>
          <p className="text-sm text-slate-500">
            Surat Ijin Angkut Orang Sakit
          </p>
        </div>
        <select
          value={filterLokasi}
          onChange={(e) => setFilterLokasi(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">Semua Lokasi</option>
          {DAFTAR_LOKASI.map((lokasi) => (
            <option key={lokasi} value={lokasi}>
              {lokasi}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KartuRingkas label="Total SIAOS" value={total} />
        <KartuRingkas label="Bulan Ini" value={totalBulanIni} accent />
        <KartuRingkas label="Samarinda" value={perLokasi['Samarinda']} />
        <KartuRingkas label="APT Pranoto" value={perLokasi['APT Pranoto']} />
        <KartuRingkas label="Lhoktuan" value={perLokasi['Lhoktuan']} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <KartuDonut title="Proporsi by Jenis Kelamin" data={dataJenisKelamin} />
        <KartuDonut title="Proporsi by Kelompok Usia" data={dataKelompokUsia} />
        <KartuDonut title="Proporsi by Moda Transportasi" data={dataModaTransportasi} />
        <KartuDonut title="Boleh Melanjutkan Perjalanan" data={dataMelanjutkanPerjalanan} />
        <KartuDonut title="Butuh Bantuan Medis" data={dataButuhBantuanMedis} />
        <KartuDonut title="Memerlukan Roda/Kereta Dorong/Tandu" data={dataPerluKursiDorong} />
        <KartuDonut title="Memerlukan Bantuan Makanan/Medikasi" data={dataPerluBantuanMakanan} />
      </div>

      {/* ===== MINGGUAN ===== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Rentang Mingguan</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Dari</span>
            <select
              value={mingguDari || daftarMingguTersedia[0]?.key || ''}
              onChange={(e) => setMingguDari(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {daftarMingguTersedia.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-slate-500">Sampai</span>
            <select
              value={mingguSampai || daftarMingguTersedia[daftarMingguTersedia.length - 1]?.key || ''}
              onChange={(e) => setMingguSampai(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {daftarMingguTersedia.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-slate-700">
          Tren Mingguan — Total{!tampilkanPerWilayah ? ` (${filterLokasi})` : ''}
        </h4>
        {periodeMinggu && <p className="mb-2 text-xs text-slate-400">Menampilkan data {periodeMinggu}</p>}
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dataMingguanTotal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="minggu" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="jumlah"
              name={tampilkanPerWilayah ? 'Total' : filterLokasi}
              stroke={tampilkanPerWilayah ? WARNA_TOTAL : WARNA_LOKASI[filterLokasi] || WARNA_TOTAL}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {tampilkanPerWilayah && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Tren Mingguan — Per Wilayah Kerja</h3>
          {periodeMinggu && <p className="mb-2 text-xs text-slate-400">Menampilkan data {periodeMinggu}</p>}
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dataMingguanPerWilayah}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="minggu" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {DAFTAR_LOKASI.map((lokasi) => (
                <Line
                  key={lokasi}
                  type="monotone"
                  dataKey={lokasi}
                  name={lokasi}
                  stroke={WARNA_LOKASI[lokasi]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== BULANAN ===== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Rentang Bulanan</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Dari</span>
            <select
              value={bulanDari || daftarBulanTersedia[0]?.key || ''}
              onChange={(e) => setBulanDari(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {daftarBulanTersedia.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
            <span className="text-slate-500">Sampai</span>
            <select
              value={bulanSampai || daftarBulanTersedia[daftarBulanTersedia.length - 1]?.key || ''}
              onChange={(e) => setBulanSampai(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {daftarBulanTersedia.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-slate-700">
          Tren Bulanan — Total{!tampilkanPerWilayah ? ` (${filterLokasi})` : ''}
        </h4>
        {periodeBulan && <p className="mb-2 text-xs text-slate-400">Menampilkan data periode {periodeBulan}</p>}
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dataBulananTotal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="bulan" tickFormatter={(v) => formatBulanIndonesia(String(v))} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(label) => formatBulanIndonesia(String(label))} />
            <Bar
              dataKey="jumlah"
              name={tampilkanPerWilayah ? 'Total' : filterLokasi}
              fill={tampilkanPerWilayah ? WARNA_TOTAL : WARNA_LOKASI[filterLokasi] || WARNA_TOTAL}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {tampilkanPerWilayah && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Tren Bulanan — Per Wilayah Kerja</h3>
          {periodeBulan && <p className="mb-2 text-xs text-slate-400">Menampilkan data periode {periodeBulan}</p>}
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataBulananPerWilayah}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bulan" tickFormatter={(v) => formatBulanIndonesia(String(v))} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(label) => formatBulanIndonesia(String(label))} />
              <Legend />
              {DAFTAR_LOKASI.map((lokasi) => (
                <Bar key={lokasi} dataKey={lokasi} name={lokasi} fill={WARNA_LOKASI[lokasi]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== Grafik horizontal: Pelabuhan & Top Diagnosa ===== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Pelabuhan Tujuan</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, dataPelabuhan.length * 40)}>
          <BarChart data={dataPelabuhan} layout="vertical" margin={{ left: 24, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" name="Jumlah" fill="#0f766e" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Top {JUMLAH_TOP_DIAGNOSA} Diagnosa
        </h3>
        <p className="mb-2 text-xs text-slate-400">
          Dihitung dari teks diagnosa yang dipecah per koma. Variasi penulisan/typo dihitung terpisah.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(240, dataTopDiagnosa.length * 40)}>
          <BarChart data={dataTopDiagnosa} layout="vertical" margin={{ left: 24, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={260} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" name="Jumlah" fill="#f59e0b" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KartuRingkas({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? 'text-amber-500' : 'text-teal-900'}`}>
        {value}
      </div>
    </div>
  );
}

function KartuDonut({ title, data }: { title: string; data: Kategori[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Judul tetap di atas, ditambahkan text-center agar posisinya di tengah */}
      <h3 className="mb-3 text-center text-lg font-semibold text-slate-700">
        {title}
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {/* Bagian <text> di dalam Pie yang sebelumnya dimasukkan HARUS DIHAPUS */}
            {data.map((_, idx) => (
              <Cell key={idx} fill={WARNA_DONUT[idx % WARNA_DONUT.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}