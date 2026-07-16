import { getRingkasanHiv, getWilkerRef } from '@/lib/supabase/queries';
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

export default async function HivPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilker, ringkasan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanHiv(tahun, wilker),
  ]);

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const { mulai, selesai } = getRentangMingguEpid(tahunBerjalan, mingguBerjalan);

  const breakdownMetode = await getBreakdownKategori({
    tabel: 'hiv_data',
    kolomTanggal: 'tgl_skrining',
    kolomKategori: 'metode_skrining',
    tglMulai: mulai,
    tglSelesai: selesai,
    kodeWilker: wilker,
  });

  const dataChart = ringkasan.map((r) => ({
    minggu_epid: r.minggu_epid,
    diperiksa: r.total_diperiksa,
    reaktif: r.total_reaktif,
    konfirmasi_positif: r.total_konfirmasi_positif,
  }));

  // 1. Tentukan status login (pasti true karena berada di rute dashboard terproteksi)
  const sudahLogin = true;

  // 2. Format periodeKey secara dinamis (contoh hasil: "2026-W28")
  const periodeKey = `${tahunBerjalan}-W${String(mingguBerjalan).padStart(2, '0')}`;

  // 3. Tentukan wilayah kerja secara aman
  const wilayahKerja = wilker === "Semua" ? undefined : wilker;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🔴 Surveilans HIV</h1>
          <p className="text-sm text-gray-500">
            Skrining HIV pada ABK dan kelompok risiko.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          
          <TombolAnalisisAI
            sudahLogin={sudahLogin}
            role={role as any}
            konteks="hiv-mingguan"
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
              Tren Diperiksa / Reaktif / Konfirmasi Positif — Tahun {tahun}
            </h2>
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'diperiksa', label: 'Diperiksa', warna: '#0F4C5C' },
                { key: 'reaktif', label: 'Reaktif', warna: '#D4537E' },
                { key: 'konfirmasi_positif', label: 'Konfirmasi Positif', warna: '#880E4F' },
              ]}
            />
          </div>

          <BreakdownList
            judul={`Metode Skrining — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownMetode}
            warna="#880E4F"
          />
        </div>
      )}
    </div>
  );
}