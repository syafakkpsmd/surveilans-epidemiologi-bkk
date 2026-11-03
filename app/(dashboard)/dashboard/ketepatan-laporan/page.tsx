/**
 * app/(dashboard)/dashboard/ketepatan-laporan/page.tsx
 *
 * Dashboard Ketepatan dan Kelengkapan Laporan Surveilans.
 * Saat ini memakai DATA CONTOH (lib/ketepatan-laporan/mock-data.ts). Untuk
 * data asli, ganti buatMockLaporan() dengan query yang menghasilkan
 * `units: UnitFaskes[]` dan `laporan: LaporanMasuk[]` (lihat types.ts).
 */

import KetepatanLaporanClient from '@/components/ketepatan-laporan/KetepatanLaporanClient';
import { buatMockLaporan } from '@/lib/ketepatan-laporan/mock-data';
import { tahunWita } from '@/lib/ketepatan-laporan/waktu';

// "Sekarang" menentukan periode mana yang sudah jatuh tempo, jadi halaman
// tidak boleh dibekukan saat build.
export const dynamic = 'force-dynamic';

export default function KetepatanLaporanPage() {
  const now = new Date();
  const tahunBerjalan = tahunWita(now);
  const { units, laporan } = buatMockLaporan(now, [tahunBerjalan - 1, tahunBerjalan]);

  return (
    <div className="p-4 sm:p-6">
      <KetepatanLaporanClient nowIso={now.toISOString()} tahunBerjalan={tahunBerjalan} units={units} laporan={laporan} />
    </div>
  );
}
