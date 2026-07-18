// ================================================================
// app/(dashboard)/dashboard/vektor/anopheles/larva/page.tsx (VERSI BARU)
// ================================================================

import { getWilkerRef } from '@/lib/supabase/queries';
import {
  getTrenLarva,
  getMacamTempatPerindukan,
  getKeadaanTempatPerindukan,
} from '@/lib/supabase/queries'; // sudah digabung ke queries.ts
import { getUserRole } from '@/lib/auth/get-user-role';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import PanelTrenPeriode from '@/components/vektor/PanelTrenPeriode';
import DonutChart from '@/components/vektor/DonutChart';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import { getMingguEpidSaatIni } from '@/lib/epi-week';

export default async function LarvaPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();
  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();

  // WAJIB persis literal 'anopheles-larva-mingguan' (lihat
  // app/api/analisis-ai/route.ts) -- tidak boleh digabung kode wilker.
  const konteksAI = 'anopheles-larva-mingguan';
  const periodeKey = `${tahunBerjalan}-W${mingguBerjalan}`;

  const [role, daftarWilker, dataMingguan, dataBulanan, macamTempat, keadaanTempat] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getTrenLarva(tahun, wilker, 'mingguan'),
    getTrenLarva(tahun, wilker, 'bulanan'),
    getMacamTempatPerindukan(tahun, wilker),
    getKeadaanTempatPerindukan(tahun, wilker),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Vektor Anopheles — Larva</h1>
          <p className="text-sm text-gray-500">
            Kepadatan larva, cidukan positif, dan kondisi tempat perindukan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi />
        </div>
      </div>

      <PanelTrenPeriode
        judulBulanan="Tren Cidukan, Larva & Suhu — Bulanan"
        dataMingguan={dataMingguan}
        dataBulanan={dataBulanan}
        seriesListMingguan={[
          { key: 'cidukan', label: 'Cidukan Positif', warna: '#558B2F' },
          { key: 'larva', label: 'Jumlah Larva', warna: '#2E7D32' },
          { key: 'suhu', label: 'Suhu (°C)', warna: '#E65100' },
        ]}
        seriesListBulanan={[
          { key: 'cidukan', label: 'Cidukan Positif', warna: '#558B2F' },
          { key: 'larva', label: 'Jumlah Larva', warna: '#2E7D32' },
          { key: 'suhu', label: 'Suhu (°C)', warna: '#E65100', axis: 'kanan' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <BoxAnalisisAI
          konteks={konteksAI}
          periodeKey={periodeKey}
          wilayahKerja={wilker}
          sudahLogin={!!role}
          role={role === 'tamu' ? null : role}
        />
        <BoxPrediksiAI
          konteks={konteksAI}
          periodeKey={periodeKey}
          wilayahKerja={wilker}
          sudahLogin={!!role}
          role={role === 'tamu' ? null : role}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DonutChart judul="Macam Tempat Perindukan (via spesies larva)" data={macamTempat} />
        <DonutChart judul="Keadaan Tempat Perindukan" data={keadaanTempat} />
      </div>
    </div>
  );
}