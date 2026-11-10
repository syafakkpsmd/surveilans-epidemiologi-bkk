/**
 * app/(dashboard)/dashboard/ketepatan-laporan/page.tsx
 *
 * Dashboard Ketepatan dan Kelengkapan Laporan Surveilans dengan DATA ASLI.
 * Modul yang dipantau (mingguan / bulanan / siklus) dan target kegiatan diatur admin di
 * /dashboard/pengaturan-pemantauan-laporan (lib/pemantauan-laporan/server.ts).
 */

import KetepatanLaporanClient from '@/components/ketepatan-laporan/KetepatanLaporanClient';
import { getUserRole } from '@/lib/auth/get-user-role';
import { tahunWita } from '@/lib/ketepatan-laporan/waktu';
import { ambilDataPemantauan } from '@/lib/pemantauan-laporan/server';

// "Sekarang" menentukan periode mana yang sudah jatuh tempo, jadi halaman tidak boleh dibekukan saat build.
export const dynamic = 'force-dynamic';

export default async function KetepatanLaporanPage() {
  const now = new Date();
  const tahunBerjalan = tahunWita(now);
  const [data, peran] = await Promise.all([ambilDataPemantauan([tahunBerjalan - 1, tahunBerjalan]), getUserRole()]);

  return (
    <div className="p-4 sm:p-6">
      <KetepatanLaporanClient
        nowIso={now.toISOString()}
        tahunBerjalan={tahunBerjalan}
        units={data.units}
        laporan={data.laporan}
        kegiatan={data.kegiatan}
        gagal={data.gagal}
        wilayahTakDikenal={data.wilayahTakDikenal}
        tabelPengaturanAda={data.tabelPengaturanAda}
        adalahAdmin={peran === 'admin'}
      />
    </div>
  );
}
