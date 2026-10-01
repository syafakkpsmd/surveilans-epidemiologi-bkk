/**
 * app/(dashboard)/dashboard/status-laporan/lalu-lintas-orang/page.tsx
 *
 * Status Kepatuhan Pelaporan -- menu Lalu Lintas Orang.
 *  - Mingguan: Kunjungan Poliklinik, Penumpang Kapal, SIAOS, KIER, PIE
 *    Nasional, PIE Global, SKDR.
 *  - Bulanan: Surveilans TB, Surveilans HIV, Migrasi Malaria.
 * Mingguan di atas, Bulanan di bawah (sama seperti halaman Alat Angkut).
 */

import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import { rentangTanggalMingguEpid, labelRentangTanggal } from '@/lib/status-laporan/rentang';
import {
  MODUL_MINGGUAN,
  MODUL_BULANAN,
  buildMatriksMingguanLlo,
  buildMatriksBulananLlo,
} from '@/lib/status-laporan/lalu-lintas-orang';
import {
  ambilStatusMingguanLlo,
  ambilStatusBulananLlo,
} from '@/lib/status-laporan/queriesLaluLintasOrang';
import KontrolPeriode from '@/components/status-laporan/KontrolPeriode';
import TabStatusLaporan from '@/components/status-laporan/TabStatusLaporan';
import TabelLaluLintas from '@/components/status-laporan/TabelLaluLintas';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function angka(nilai: string | undefined, awal: number, min: number, max: number): number {
  const n = nilai ? parseInt(nilai, 10) : NaN;
  if (!Number.isFinite(n)) return awal;
  return Math.min(max, Math.max(min, n));
}

export default async function StatusLaluLintasOrangPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun_mg?: string; minggu?: string; tahun_bl?: string; bulan?: string }>;
}) {
  const sp = await searchParams;
  const sekarang = new Date();

  // Default: minggu epid SEBELUMNYA (minggu berjalan belum selesai). Dihitung
  // dari tanggal 7 hari lalu, jadi aman juga di awal tahun (tidak jadi minggu 0).
  const mingguLalu = hitungMingguEpidemiologi(new Date(sekarang.getTime() - 7 * 86_400_000));
  const tahunMg = angka(sp.tahun_mg, mingguLalu.tahunEpid, 2020, 2100);
  const minggu = angka(sp.minggu, mingguLalu.mingguEpid, 1, 53);

  // Default bulanan: BULAN LALU (bulan berjalan belum selesai, hampir pasti "Belum").
  const bulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1);
  const tahunBl = angka(sp.tahun_bl, bulanLalu.getFullYear(), 2020, 2100);
  const bulan = angka(sp.bulan, bulanLalu.getMonth() + 1, 1, 12);

  const [srcMingguan, srcBulanan] = await Promise.all([
    ambilStatusMingguanLlo(tahunMg, minggu),
    ambilStatusBulananLlo(tahunBl, bulan),
  ]);

  const matriksMingguan = buildMatriksMingguanLlo(srcMingguan);
  const matriksBulanan = buildMatriksBulananLlo(srcBulanan);
  const { awal, akhir } = rentangTanggalMingguEpid(tahunMg, minggu);

  return (
    <div className="space-y-8">
      <TabStatusLaporan aktif="lalu-lintas" />

      {/* ================= MINGGUAN ================= */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F2A38]">📋 Status Kepatuhan Pelaporan Mingguan — Lalu Lintas Orang</h1>
            <p className="text-sm text-gray-500">
              Minggu Epidemiologi ke-{minggu}, Tahun {tahunMg} ({labelRentangTanggal(awal, akhir)})
            </p>
          </div>
          <KontrolPeriode varian="mingguan" tahun={tahunMg} minggu={minggu} />
        </div>
        <TabelLaluLintas kolom={MODUL_MINGGUAN} data={matriksMingguan} />
        <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
          <li>“—” berarti bukan kewajiban wilayah kerja tersebut (tidak dihitung Belum).</li>
          <li>“Sudah” berarti ada minimal satu data pada minggu itu; 0 kasus pada SKDR tetap dihitung Sudah.</li>
          <li>SKDR Samarinda baru dihitung Sudah bila Puskesmas Palaran dan Sidomulyo sama-sama sudah masuk.</li>
          <li>PIE Nasional dan PIE Global dilaporkan di tingkat BKK, jadi statusnya ada di baris terakhir.</li>
        </ul>
      </div>

      {/* ================= BULANAN ================= */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F2A38]">📋 Status Kepatuhan Pelaporan Bulanan — Lalu Lintas Orang</h1>
            <p className="text-sm text-gray-500">
              {NAMA_BULAN[bulan - 1]} {tahunBl}
            </p>
          </div>
          <KontrolPeriode varian="bulanan" tahun={tahunBl} bulan={bulan} />
        </div>
        <TabelLaluLintas kolom={MODUL_BULANAN} data={matriksBulanan} lebarMin="min-w-140" />
      </div>
    </div>
  );
}
