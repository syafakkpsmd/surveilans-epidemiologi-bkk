// ================================================================
// SEGMEN 11 — app/(dashboard)/dashboard/vektor/anopheles/page.tsx
// Satu halaman, toggle tab Dewasa | Larva via ?tipe= (bukan 2 route
// terpisah), sesuai KONTEKS PROYEK.
// ================================================================

import { getRingkasanVektorAnopheles, getWilkerRef } from '@/lib/supabase/queries';
import { getUserRole } from '@/lib/auth/get-user-role';
import FilterWilker from '@/components/vektor/FilterWilker';
import ToggleTipeAnopheles from '@/components/vektor/ToggleTipeAnopheles';
import TrenChartMingguan from '@/components/vektor/TrenChartMingguan';
import { TombolAnalisisAI } from '@/components/TombolAnalisisAI';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import { getMingguEpidSaatIni } from '@/lib/epi-week';

export default async function VektorAnophelesPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string; tipe?: string }>;
}) {
  const { wilker, tahun: tahunParam, tipe: tipeParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();
  const tipe: 'dewasa' | 'larva' = tipeParam === 'larva' ? 'larva' : 'dewasa';

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();

  const [role, daftarWilker, ringkasan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanVektorAnopheles(tahun, tipe, wilker),
  ]);

  // TAMBAHKAN BLOK INI:
    const konteksAI = [
    'vektor-anopheles',
    tipe,
    wilker ? wilker.toLowerCase() : null
    ]
    .filter(Boolean)
    .join('-');
    // --------------------

  const dataChart =
    tipe === 'dewasa'
      ? ringkasan.map((r) => ({
          minggu_epid: r.minggu_epid,
          mbr: r.mbr_rerata ?? 0,
          suhu: r.suhu_rerata ?? 0,
        }))
      : ringkasan.map((r) => ({
          minggu_epid: r.minggu_epid,
          total_larva: r.total_larva ?? 0,
          total_cidukan: r.total_cidukan ?? 0,
        }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Vektor Anopheles</h1>
          <p className="text-sm text-gray-500">
            {tipe === 'dewasa'
              ? 'MBR (Man Biting Rate) & korelasi cuaca/fase bulan.'
              : 'Kepadatan larva & jumlah cidukan positif.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <FilterWilker daftarWilker={daftarWilker} />
            <FilterZonaSubLokasi />
            <TombolAnalisisAI 
                sudahLogin={!!role} // Jika role ada (admin/petugas), maka true
                role={(role === 'admin' || role === 'petugas') ? role : null} 
                konteks={konteksAI}
                periodeKey={`${tahunBerjalan}-${mingguBerjalan}`} // Wajib sesuai kebutuhan komponen
                wilayahKerja={wilker ?? undefined} // Opsional, sesuaikan dengan interface
            />
        </div>
      </div>

      {ringkasan.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada data {tipe === 'dewasa' ? 'nyamuk dewasa' : 'larva'} untuk tahun {tahun}.
        </div>
      ) : (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Tren {tipe === 'dewasa' ? 'MBR' : 'Larva & Cidukan'} — Tahun {tahun}
          </h2>
          {tipe === 'dewasa' ? (
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'mbr', label: 'MBR (per jam)', warna: '#1B5E20' },
                { key: 'suhu', label: 'Suhu (°C)', warna: '#E65100' },
              ]}
            />
          ) : (
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'total_larva', label: 'Total Larva', warna: '#2E7D32' },
                { key: 'total_cidukan', label: 'Total Cidukan', warna: '#558B2F' },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}