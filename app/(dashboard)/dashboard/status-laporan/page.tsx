/**
 * app/(dashboard)/dashboard/status-laporan/page.tsx
 *
 * Halaman Status Kepatuhan Pelaporan -- 2 matriks (Mingguan & Bulanan).
 * Sengaja TIDAK memasang TombolAnalisisAI di halaman ini: ini halaman
 * kepatuhan administratif, bukan analisis epidemiologi.
 */

import { getMingguEpidSaatIni } from '@/lib/epi-week';
import {
  getStatusLaporMingguan,
  getStatusLaporBulanan,
} from '@/lib/supabase/queriesStatusLaporan';
import { buildMatriksMingguan, buildMatriksBulanan } from '@/lib/status-laporan/core';
import KontrolPeriode from '@/components/status-laporan/KontrolPeriode';
import TabelMingguan from '@/components/status-laporan/TabelMingguan';
import TabelBulanan from '@/components/status-laporan/TabelBulanan';

export default async function StatusLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    tahun?: string;
    minggu?: string;
    bulan?: string;
  }>;
}) {
  const { tab: tabParam, tahun: tahunParam, minggu: mingguParam, bulan: bulanParam } =
    await searchParams;

  const tab: 'mingguan' | 'bulanan' = tabParam === 'bulanan' ? 'bulanan' : 'mingguan';

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const bulanBerjalan = new Date().getMonth() + 1;
  const tahunSekarang = new Date().getFullYear();

  const tahun = tahunParam
    ? parseInt(tahunParam, 10)
    : tab === 'mingguan'
      ? tahunBerjalan
      : tahunSekarang;
  const minggu = mingguParam ? parseInt(mingguParam, 10) : mingguBerjalan - 1; //Minggu di kurangi 1 karena minggu berjalan belum selesai
  const bulan = bulanParam ? parseInt(bulanParam, 10) : bulanBerjalan;

  const [rowsMingguan, rowsBulanan] = await Promise.all([
    tab === 'mingguan' ? getStatusLaporMingguan(tahun, minggu) : Promise.resolve([]),
    tab === 'bulanan' ? getStatusLaporBulanan(tahun, bulan) : Promise.resolve([]),
  ]);

  const matriksMingguan = buildMatriksMingguan(rowsMingguan);
  const matriksBulanan = buildMatriksBulanan(rowsBulanan);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">📋 Status Kepatuhan Pelaporan</h1>
          <p className="text-sm text-gray-500">
            {tab === 'mingguan'
              ? `Minggu Epidemiologi ke-${minggu}, Tahun ${tahun}`
              : `Bulan ${bulan}/${tahun}`}
          </p>
        </div>
        <KontrolPeriode tab={tab} tahun={tahun} minggu={minggu} bulan={bulan} />
      </div>

      {tab === 'mingguan' ? (
        <TabelMingguan data={matriksMingguan} />
      ) : (
        <TabelBulanan data={matriksBulanan} />
      )}
    </div>
  );
}