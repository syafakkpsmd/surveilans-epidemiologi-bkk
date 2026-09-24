// app/(dashboard)/dashboard/tb/TbClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import type {
  RingkasanCascadeTb,
  TitikTrenTb,
  BreakdownFaktorRisikoTb,
  BreakdownWilkerTb,
  RingkasanDelayTb,
  DistribusiWilayahTb,
  TerdugaBelumTindakLanjutTb,
} from '@/lib/turso/tb';

const WARNA = ['#0d9488', '#0f766e', '#134e4a', '#f59e0b', '#dc2626', '#1e3a8a'];

const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const NAMA_BULAN_PENUH = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// "2026-02" -> "Feb" (untuk sumbu chart, hemat tempat) atau "Februari 2026" (label lengkap)
function formatPeriodeBulan(periode: string, penuh = false): string {
  const [tahun, bulanStr] = periode.split('-');
  const idx = parseInt(bulanStr, 10) - 1;
  if (idx < 0 || idx > 11) return periode;
  return penuh ? `${NAMA_BULAN_PENUH[idx]} ${tahun}` : NAMA_BULAN_PENDEK[idx];
}

// "2026-W12" -> "Minggu 12"
function formatPeriodeMinggu(periode: string): string {
  const m = periode.match(/W(\d+)/);
  return m ? `Minggu ${parseInt(m[1], 10)}` : periode;
}

interface Props {
  // FIX: sudahLogin & roleAI sekarang dihitung di page.tsx lewat
  // getStatusAkses() (pola asli project), bukan diturunkan manual di sini
  // dari getUserRole(). roleAI ikut petugas_klinik juga.
  sudahLogin: boolean;
  roleAI: 'admin' | 'petugas' | 'petugas_klinik' | null;
  tahunBerjalan: number;
  daftarWilker: readonly string[];
  wilayahTerpilih: string;
  cascade: RingkasanCascadeTb;
  trenMingguan: TitikTrenTb[];
  trenBulanan: TitikTrenTb[];
  breakdownFaktorRisiko: BreakdownFaktorRisikoTb[];
  breakdownWilker: BreakdownWilkerTb[];
  delayDiagnosis: RingkasanDelayTb;
  distribusiKabKota: DistribusiWilayahTb[];
  donutJenisKelamin: { label: string; jumlah: number }[];
  // Daftar nama individu cuma dikirim ke sini kalau page.tsx sudah
  // memastikan role berwenang (admin/petugas_klinik) -- lihat
  // bolehLihatDaftarSensitif. jumlahBelumTindakLanjut TETAP dikirim
  // (angka saja, bukan data pribadi) supaya semua orang tetap tahu ada
  // berapa yang perlu ditindaklanjuti.
  bolehLihatDaftarSensitif: boolean;
  daftarBelumTindakLanjut: TerdugaBelumTindakLanjutTb[];
  jumlahBelumTindakLanjut: number;
}

export default function TbClient({
  sudahLogin,
  roleAI,
  tahunBerjalan,
  daftarWilker,
  wilayahTerpilih,
  cascade,
  trenMingguan,
  trenBulanan,
  breakdownFaktorRisiko,
  breakdownWilker,
  delayDiagnosis,
  distribusiKabKota,
  donutJenisKelamin,
  bolehLihatDaftarSensitif,
  daftarBelumTindakLanjut,
  jumlahBelumTindakLanjut,
}: Props) {
  const router = useRouter();
  const [granularitas, setGranularitas] = useState<'mingguan' | 'bulanan'>('mingguan');

  function gantiWilayah(wilayah: string) {
    router.push(`/dashboard/tb?tahun=${tahunBerjalan}&wilayah=${encodeURIComponent(wilayah)}`);
  }

  // periodeKeyTerakhir untuk AI SELALU pakai periode terakhir yang benar-benar
  // ada datanya (tidak ikut terpotong oleh filter rentang tampilan di bawah).
  const dataTrenLengkap = granularitas === 'mingguan' ? trenMingguan : trenBulanan;
  const periodeKeyTerakhir =
    dataTrenLengkap.length > 0 ? dataTrenLengkap[dataTrenLengkap.length - 1].periode : `${tahunBerjalan}`;

  // --- Filter rentang Bulanan (dari bulan .. sampai bulan ..) ---
  const opsiBulan = trenBulanan.map((t) => ({ value: t.periode, label: formatPeriodeBulan(t.periode, true) }));
  const [rentangBulanMulai, setRentangBulanMulai] = useState(trenBulanan[0]?.periode ?? '');
  const [rentangBulanAkhir, setRentangBulanAkhir] = useState(trenBulanan[trenBulanan.length - 1]?.periode ?? '');
  const [tempBulanMulai, setTempBulanMulai] = useState(rentangBulanMulai);
  const [tempBulanAkhir, setTempBulanAkhir] = useState(rentangBulanAkhir);

  // --- Filter rentang Mingguan (dari minggu ke-.. sampai minggu ke-..) ---
  const opsiMinggu = trenMingguan.map((t) => ({ value: t.periode, label: `${formatPeriodeMinggu(t.periode)} (${t.periode.split('-')[0]})` }));
  const [rentangMingguMulai, setRentangMingguMulai] = useState(trenMingguan[0]?.periode ?? '');
  const [rentangMingguAkhir, setRentangMingguAkhir] = useState(trenMingguan[trenMingguan.length - 1]?.periode ?? '');
  const [tempMingguMulai, setTempMingguMulai] = useState(rentangMingguMulai);
  const [tempMingguAkhir, setTempMingguAkhir] = useState(rentangMingguAkhir);

  function terapkanRentangBulan() {
    // periodeKey berformat "YYYY-MM" jadi aman dibandingkan sebagai string
    const [mulai, akhir] = tempBulanMulai <= tempBulanAkhir ? [tempBulanMulai, tempBulanAkhir] : [tempBulanAkhir, tempBulanMulai];
    setRentangBulanMulai(mulai);
    setRentangBulanAkhir(akhir);
  }

  function terapkanRentangMinggu() {
    const [mulai, akhir] = tempMingguMulai <= tempMingguAkhir ? [tempMingguMulai, tempMingguAkhir] : [tempMingguAkhir, tempMingguMulai];
    setRentangMingguMulai(mulai);
    setRentangMingguAkhir(akhir);
  }

  const dataTrenBulananTampil = trenBulanan.filter(
    (t) => t.periode >= rentangBulanMulai && t.periode <= rentangBulanAkhir
  );
  const dataTrenMingguanTampil = trenMingguan.filter(
    (t) => t.periode >= rentangMingguMulai && t.periode <= rentangMingguAkhir
  );
  const dataTrenTampil = granularitas === 'mingguan' ? dataTrenMingguanTampil : dataTrenBulananTampil;
  // dipakai sumbu-X chart Bulanan supaya tampil nama bulan Indonesia, bukan "2026-02"
  const dataTrenTampilUntukChart =
    granularitas === 'bulanan'
      ? dataTrenTampil.map((t) => ({ ...t, labelSumbu: formatPeriodeBulan(t.periode) }))
      : dataTrenTampil.map((t) => ({ ...t, labelSumbu: t.periode }));

  const cascadeData = [
    { tahap: 'Diskrining', jumlah: cascade.totalSkrining },
    { tahap: 'Terduga TBC', jumlah: cascade.totalTerduga },
    { tahap: 'Diperiksa', jumlah: cascade.totalDiperiksa },
    { tahap: 'Terkonfirmasi', jumlah: cascade.totalTerkonfirmasi },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-teal-900">
          Modul TB — Skrining &amp; Investigasi Kontak ({tahunBerjalan})
        </h1>
        {wilayahTerpilih !== 'semua' && (
          <p className="mt-1 text-sm text-gray-500">Wilayah kerja: {wilayahTerpilih}</p>
        )}
      </div>

      {/* Filter tab Wilayah Kerja -- mengikuti tata letak sheet sumbernya
          (1 wilker = 1 tab), plus "Semua Wilayah Kerja" untuk gabungan */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <TabWilayah aktif={wilayahTerpilih === 'semua'} onClick={() => gantiWilayah('semua')}>
          Semua Wilayah Kerja
        </TabWilayah>
        {daftarWilker.map((w) => (
          <TabWilayah key={w} aktif={wilayahTerpilih === w} onClick={() => gantiWilayah(w)}>
            {w}
          </TabWilayah>
        ))}
      </div>

      {/* Kartu ringkasan cascade */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KartuRingkasan label="Total Diskrining" nilai={cascade.totalSkrining} />
        <KartuRingkasan label="Terduga TBC" nilai={cascade.totalTerduga} />
        <KartuRingkasan label="Terkonfirmasi TBC" nilai={cascade.totalTerkonfirmasi} aksen="teal" />
        <KartuRingkasan
          label="Case Detection Rate"
          nilai={`${cascade.caseDetectionRate.toFixed(2)}%`}
        />
      </div>

      {/* Cascade funnel */}
      <Panel judul="Cascade Skrining TBC">
        <p className="mb-2 text-sm text-gray-600">
          Menunjukkan penurunan jumlah dari total diskrining sampai terkonfirmasi TBC — titik
          penurunan tajam menandakan potensi loss-to-follow-up yang perlu ditindaklanjuti.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={cascadeData} margin={{ top: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tahap" />
            <YAxis />
            <Tooltip />
            {/* FIX: angka tetap kelihatan lewat label di atas bar, walau
                bar-nya nyaris tak kelihatan karena jauh lebih kecil dari
                Diskrining (mis. 2 vs 611). */}
            <Bar dataKey="jumlah" fill="#0d9488">
              <LabelList dataKey="jumlah" position="top" style={{ fill: '#134e4a', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-sm text-gray-600">
          Yield dari terduga ke terkonfirmasi: <b>{cascade.yieldRateTerduga.toFixed(2)}%</b>
        </p>
      </Panel>

      {/* Tren -- toggle dipindah ke sini (menempel di panel, gaya sama
          seperti dashboard Kunjungan Poliklinik), plus filter rentang
          dari-sampai dan nama bulan Indonesia */}
      <Panel judul={`Tren ${granularitas === 'mingguan' ? 'Mingguan' : 'Bulanan'}`}>
        <div className="mb-3 flex gap-2">
          <ToggleButton aktif={granularitas === 'mingguan'} onClick={() => setGranularitas('mingguan')}>
            Mingguan
          </ToggleButton>
          <ToggleButton aktif={granularitas === 'bulanan'} onClick={() => setGranularitas('bulanan')}>
            Bulanan
          </ToggleButton>
        </div>

        {/* Filter rentang -- terpisah per granularitas, disimpan sebagai
            state "temp" dulu, baru diterapkan lewat tombol supaya tidak
            reload chart di tiap ketukan dropdown */}
        {granularitas === 'bulanan' ? (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <FieldSelect label="Dari bulan" value={tempBulanMulai} onChange={setTempBulanMulai} opsi={opsiBulan} />
            <FieldSelect label="Sampai bulan" value={tempBulanAkhir} onChange={setTempBulanAkhir} opsi={opsiBulan} />
            <button
              onClick={terapkanRentangBulan}
              className="rounded bg-teal-700 px-3 py-1.5 text-sm text-white hover:bg-teal-800"
            >
              Terapkan
            </button>
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <FieldSelect label="Dari minggu" value={tempMingguMulai} onChange={setTempMingguMulai} opsi={opsiMinggu} />
            <FieldSelect label="Sampai minggu" value={tempMingguAkhir} onChange={setTempMingguAkhir} opsi={opsiMinggu} />
            <button
              onClick={terapkanRentangMinggu}
              className="rounded bg-teal-700 px-3 py-1.5 text-sm text-white hover:bg-teal-800"
            >
              Terapkan
            </button>
          </div>
        )}

        <ResponsiveContainer width="100%" height={280}>
          {/* Bulanan pakai Bar Chart, Mingguan tetap Line Chart.
              labelSumbu = "2026-02" -> "Feb" untuk Bulanan (nama bulan
              Indonesia), dibiarkan apa adanya untuk Mingguan. */}
          {granularitas === 'mingguan' ? (
            <LineChart data={dataTrenTampilUntukChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="labelSumbu" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalSkrining" name="Diskrining" stroke="#0f766e" />
              <Line type="monotone" dataKey="totalTerduga" name="Terduga" stroke="#f59e0b" />
              <Line type="monotone" dataKey="totalTerkonfirmasi" name="Terkonfirmasi" stroke="#dc2626" />
            </LineChart>
          ) : (
            <BarChart data={dataTrenTampilUntukChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="labelSumbu" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const periode = payload?.[0]?.payload?.periode as string | undefined;
                  return periode ? formatPeriodeBulan(periode, true) : '';
                }}
              />
              <Legend />
              <Bar dataKey="totalSkrining" name="Diskrining" fill="#0f766e" />
              <Bar dataKey="totalTerduga" name="Terduga" fill="#f59e0b" />
              <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#dc2626" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Panel>

      <BoxAnalisisAI
        sudahLogin={sudahLogin}
        role={roleAI}
        konteks={granularitas === 'mingguan' ? 'tb-mingguan' : 'tb-bulanan'}
        periodeKey={periodeKeyTerakhir}
        wilayahKerja={undefined}
      />
      <BoxPrediksiAI
        sudahLogin={sudahLogin}
        role={roleAI}
        konteks={granularitas === 'mingguan' ? 'tb-mingguan' : 'tb-bulanan'}
        periodeKey={periodeKeyTerakhir}
        wilayahKerja={undefined}
      />

      {/* Breakdown faktor risiko -- FIX: diganti jadi grouped bar
          Diskrining vs Terkonfirmasi (selalu ada tinggi bar), yield%
          ditampilkan di tooltip supaya tidak jadi chart kosong kalau
          jumlah terkonfirmasi masih sedikit/nol. */}
      <Panel judul="Yield per Faktor Risiko (Target Skrining Aktif)">
        <p className="mb-2 text-sm text-gray-600">
          Jumlah diskrining vs terkonfirmasi TBC pada tiap kelompok risiko — arahkan kursor untuk
          lihat persentase yield. Membantu mengarahkan prioritas skrining aktif (ACF).
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={breakdownFaktorRisiko} layout="vertical" margin={{ left: 110 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="faktor" width={120} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name, item) => {
                if (name === 'Terkonfirmasi') {
                  const yieldPersen = (item?.payload as BreakdownFaktorRisikoTb | undefined)?.yieldPersen ?? 0;
                  return [`${value} (yield ${yieldPersen.toFixed(2)}%)`, 'Terkonfirmasi'];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="totalDiskrining" name="Diskrining" fill="#94a3b8" radius={[0, 4, 4, 0]} />
            <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#dc2626" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Donut jenis kelamin */}
        <Panel judul="Distribusi Jenis Kelamin">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={donutJenisKelamin}
                dataKey="jumlah"
                nameKey="label"
                innerRadius={50}
                outerRadius={80}
                label
              >
                {donutJenisKelamin.map((_, i) => (
                  <Cell key={i} fill={WARNA[i % WARNA.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Delay diagnosis */}
        <Panel judul="Kecepatan Diagnosis (Delay)">
          <p className="text-sm text-gray-600">
            Selisih hari dari tanggal skrining sampai keluar hasil pemeriksaan diagnosis.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-semibold text-teal-800">
                {delayDiagnosis.rataRataHari}
              </div>
              <div className="text-xs text-gray-500">Rata-rata (hari)</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-teal-800">
                {delayDiagnosis.medianHari}
              </div>
              <div className="text-xs text-gray-500">Median (hari)</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-teal-800">
                {delayDiagnosis.maksimalHari}
              </div>
              <div className="text-xs text-gray-500">Maksimal (hari)</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Dihitung dari {delayDiagnosis.jumlahKasusDihitung} kasus yang sudah punya tanggal hasil.
          </p>
        </Panel>
      </div>

      {/* Distribusi kab/kota -- FIX: sekarang sudah dibatasi Top 15 +
          "Lainnya" dari lib/turso/tb.ts, jadi tidak perlu diubah di sini,
          cuma dirapikan sedikit label sumbunya. */}
      <Panel judul="Distribusi per Kabupaten/Kota (Top 15)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={distribusiKabKota} margin={{ bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="kabupatenKota"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalSkrining" name="Diskrining" fill="#0f766e" />
            <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Breakdown per Wilayah Kerja BKK -- beda dimensi dari kab/kota
          di atas (itu asal peserta, ini wilker BKK yang MELAKSANAKAN
          skrining). SELALU tampil semua 7 wilker (lihat catatan di
          page.tsx: dataUntukBreakdownWilker tidak ikut filter wilayah)
          supaya tetap jadi pembanding walau sedang memfilter 1 wilker. */}
      <Panel judul="Diskrining per Wilayah Kerja">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={breakdownWilker}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="wilayahKerja" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalSkrining" name="Diskrining" fill="#0f766e" />
            <Bar dataKey="totalTerduga" name="Terduga" fill="#f59e0b" />
            <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Daftar belum tindak lanjut -- FIX (privasi): data individu
          (nama, kab/kota, dll) cuma ditampilkan kalau bolehLihatDaftarSensitif
          true. Selain itu, cuma jumlahnya saja yang ditampilkan. */}
      <Panel judul={`Terduga TBC Belum Ada Hasil Pemeriksaan (${jumlahBelumTindakLanjut})`}>
        {!bolehLihatDaftarSensitif ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Data individu (nama, lokasi, dll) disembunyikan — hanya bisa dilihat oleh Petugas
            Klinik yang berwenang.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Wilayah Kerja</th>
                  <th className="py-2 pr-3">Tanggal Skrining</th>
                  <th className="py-2 pr-3">Kab/Kota Asal</th>
                  <th className="py-2 pr-3">Tindak Lanjut</th>
                  <th className="py-2 pr-3">Fasyankes</th>
                </tr>
              </thead>
              <tbody>
                {daftarBelumTindakLanjut.map((d) => (
                  // FIX: key sekarang gabungan wilayahKerja+noBaris, karena
                  // no_baris tidak lagi unik global setelah data dipecah
                  // per sheet wilker (dulu 1 sheet "DATA" jadi noBaris unik).
                  <tr key={`${d.wilayahKerja}-${d.noBaris}`} className="border-b last:border-0">
                    <td className="py-2 pr-3">{d.namaPeserta}</td>
                    <td className="py-2 pr-3">{d.wilayahKerja}</td>
                    <td className="py-2 pr-3">{d.tanggalPelaksanaan}</td>
                    <td className="py-2 pr-3">{d.kabupatenKota}</td>
                    <td className="py-2 pr-3">{d.tindakLanjutPemeriksaan || '-'}</td>
                    <td className="py-2 pr-3">{d.fasyankesPemeriksaan || '-'}</td>
                  </tr>
                ))}
                {daftarBelumTindakLanjut.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-400">
                      Semua terduga TBC sudah punya hasil pemeriksaan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function KartuRingkasan({
  label,
  nilai,
  aksen,
}: {
  label: string;
  nilai: string | number;
  aksen?: 'teal';
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${aksen === 'teal' ? 'text-teal-700' : 'text-gray-900'}`}>
        {nilai}
      </div>
    </div>
  );
}

function Panel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-medium text-teal-900">{judul}</h2>
      {children}
    </div>
  );
}

function ToggleButton({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm ${aktif ? 'bg-teal-700 text-white' : 'bg-gray-100'}`}
    >
      {children}
    </button>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  opsi,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opsi: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border px-2 py-1.5 text-sm text-gray-800"
      >
        {opsi.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TabWilayah({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        aktif ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}