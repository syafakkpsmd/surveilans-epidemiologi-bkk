import { getRingkasanTb, getWilkerRef } from '@/lib/supabase/queries';
import {
  getBreakdownKategori,
  getRentangMingguEpid,
} from '@/lib/supabase/queriesVektorBreakdown';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterWilker from '@/components/vektor/FilterWilker';
import TrenChartMingguan from '@/components/vektor/TrenChartMingguan';
import BreakdownList from '@/components/vektor/BreakdownList';
import { TombolAnalisisAI } from '@/components/TombolAnalisisAI';

export default async function TbPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilker, ringkasan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanTb(tahun, wilker),
  ]);

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const { mulai, selesai } = getRentangMingguEpid(tahunBerjalan, mingguBerjalan);

  const [breakdownSensitivitas, breakdownKategori] = await Promise.all([
    getBreakdownKategori({
      tabel: 'tb_data',
      kolomTanggal: 'tgl_penemuan',
      kolomKategori: 'sensitivitas_oat',
      tglMulai: mulai,
      tglSelesai: selesai,
      kodeWilker: wilker,
    }),
    getBreakdownKategori({
      tabel: 'tb_data',
      kolomTanggal: 'tgl_penemuan',
      kolomKategori: 'kategori_pasien',
      tglMulai: mulai,
      tglSelesai: selesai,
      kodeWilker: wilker,
    }),
  ]);

  const dataChart = ringkasan.map((r) => ({
    minggu_epid: r.minggu_epid,
    suspek: r.total_suspek,
    positif_tcm: r.total_positif_tcm,
  }));

  // 1. Ambil status login (pasti true di rute dashboard terproteksi)
  const sudahLogin = true;

  // 2. Format periodeKey secara dinamis menggunakan minggu epidemiologi (misal: "2026-W28")
  const periodeKey = `${tahunBerjalan}-W${String(mingguBerjalan).padStart(2, '0')}`;

  // 3. Ambil wilayah kerja secara aman berdasarkan parameter filter URL
  const wilayahKerja = wilker === "Semua" ? undefined : wilker;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🫁 Surveilans TB</h1>
          <p className="text-sm text-gray-500">
            Deteksi & penelusuran kontak Tuberkulosis pada ABK dan pekerja.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          
          {/* Tombol Analisis AI dengan parameter lengkap & terstandarisasi */}
          <TombolAnalisisAI
            sudahLogin={sudahLogin}
            role={role as any}
            konteks="tb-mingguan"
            periodeKey={periodeKey}
            wilayahKerja={wilayahKerja}
          />
        </div>
      </div>

      {ringkasan.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada kegiatan tercatat untuk tahun {tahun}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Tren Suspek vs Positif TCM — Tahun {tahun}
            </h2>
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'suspek', label: 'Suspek', warna: '#607D8B' },
                { key: 'positif_tcm', label: 'Positif TCM', warna: '#B71C1C' },
              ]}
            />
          </div>

          <BreakdownList
            judul={`Sensitivitas OAT — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownSensitivitas}
            warna="#37474F"
          />
          <BreakdownList
            judul={`Kategori Pasien — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownKategori}
            warna="#0F4C5C"
          />
        </div>
      )}
    </div>
  );
}