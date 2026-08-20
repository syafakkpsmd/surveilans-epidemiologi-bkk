/**
 * app/(dashboard)/dashboard/status-laporan/page.tsx
 *
 * Halaman Status Kepatuhan Pelaporan -- 2 matriks (Mingguan & Bulanan)
 * ditampilkan SEKALIGUS dalam 1 halaman: Mingguan di atas, Bulanan di
 * bawah. Sengaja TIDAK memasang TombolAnalisisAI di halaman ini: ini
 * halaman kepatuhan administratif, bukan analisis epidemiologi.
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
    tahun_mg?: string;
    minggu?: string;
    tahun_bl?: string;
    bulan?: string;
  }>;
}) {
  const {
    tahun_mg: tahunMgParam,
    minggu: mingguParam,
    tahun_bl: tahunBlParam,
    bulan: bulanParam,
  } = await searchParams;

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const bulanBerjalan = new Date().getMonth() + 1;
  const tahunSekarang = new Date().getFullYear();

  const tahunMg = tahunMgParam ? parseInt(tahunMgParam, 10) : tahunBerjalan;
  // Minggu dikurangi 1 karena minggu berjalan belum selesai
  const minggu = mingguParam ? parseInt(mingguParam, 10) : mingguBerjalan - 1;

  const tahunBl = tahunBlParam ? parseInt(tahunBlParam, 10) : tahunSekarang;
  const bulan = bulanParam ? parseInt(bulanParam, 10) : bulanBerjalan;

  const [rowsMingguan, rowsBulanan] = await Promise.all([
    getStatusLaporMingguan(tahunMg, minggu),
    getStatusLaporBulanan(tahunBl, bulan),
  ]);

  const matriksMingguan = buildMatriksMingguan(rowsMingguan);
  const matriksBulanan = buildMatriksBulanan(rowsBulanan);

  return (
    <div className="space-y-10">
      {/* ============================================================
          BAGIAN ATAS -- MINGGUAN
         ============================================================ */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F2A38]">📋 Status Kepatuhan Pelaporan Mingguan</h1>
            <p className="text-sm text-gray-500">
              Minggu Epidemiologi ke-{minggu}, Tahun {tahunMg}
            </p>
          </div>
          <KontrolPeriode varian="mingguan" tahun={tahunMg} minggu={minggu} />
        </div>
        <TabelMingguan data={matriksMingguan} />
      </div>

      {/* ============================================================
          BAGIAN BAWAH -- BULANAN
         ============================================================ */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F2A38]">📋 Status Kepatuhan Pelaporan Bulanan</h1>
            <p className="text-sm text-gray-500">Bulan {bulan}/{tahunBl}</p>
          </div>
          <KontrolPeriode varian="bulanan" tahun={tahunBl} bulan={bulan} />
        </div>
        <TabelBulanan data={matriksBulanan} />
      </div>
    </div>
  );
}