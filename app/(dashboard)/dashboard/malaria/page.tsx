// ================================================================
// SEGMEN 12 — app/(dashboard)/dashboard/malaria/page.tsx
// ================================================================

import { getRingkasanMalaria, getWilkerRef } from '@/lib/supabase/queries';
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

export default async function MalariaPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilker, ringkasan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanMalaria(tahun, wilker),
  ]);

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const { mulai, selesai } = getRentangMingguEpid(tahunBerjalan, mingguBerjalan);

  const [breakdownPlasmodium, breakdownRute] = await Promise.all([
    getBreakdownKategori({
      tabel: 'malaria_migrasi',
      kolomTanggal: 'tgl_kedatangan',
      kolomKategori: 'jenis_plasmodium',
      tglMulai: mulai,
      tglSelesai: selesai,
      kodeWilker: wilker,
    }),
    getBreakdownKategori({
      tabel: 'malaria_migrasi',
      kolomTanggal: 'tgl_kedatangan',
      kolomKategori: 'rute_asal',
      tglMulai: mulai,
      tglSelesai: selesai,
      kodeWilker: wilker,
    }),
  ]);

  const dataChart = ringkasan.map((r) => ({
    minggu_epid: r.minggu_epid,
    positif_rdt: r.total_positif_rdt,
    diperiksa: r.total_diperiksa,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🔬 Surveilans Migrasi Malaria</h1>
          <p className="text-sm text-gray-500">
            Deteksi kasus malaria impor pada penumpang/ABK yang baru tiba.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          <TombolAnalisisAI role={role} konteks="malaria-mingguan" />
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
              Tren Diperiksa vs Positif RDT — Tahun {tahun}
            </h2>
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'diperiksa', label: 'Jml. Diperiksa', warna: '#0F4C5C' },
                { key: 'positif_rdt', label: 'Positif RDT', warna: '#B71C1C' },
              ]}
            />
          </div>

          <BreakdownList
            judul={`Jenis Plasmodium — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownPlasmodium}
            warna="#006064"
          />
          <BreakdownList
            judul={`Rute Asal — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownRute}
            warna="#0F4C5C"
          />
        </div>
      )}
    </div>
  );
}